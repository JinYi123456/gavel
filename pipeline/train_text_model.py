#!/usr/bin/env python3
"""Train the text-exhibit scorer shipped with GAVEL.

Pure standard library, fully deterministic (seed 42). Reads the UCI SMS Spam
Collection (tab-separated, CC BY 4.0), trains an L2-regularised logistic
regression on binary token presence, calibrates it (Platt scaling) on held-out
data, derives the verdict band from measured operating points, and exports:

  lib/engine/artifacts/text_model.json       the shipped scorer
  lib/engine/artifacts/parity_fixtures.json  messages + reference scores for the
                                             Python<->TypeScript parity test
  reports/text_model_evaluation.json         held-out metrics for publication

Run from the repository root:  python pipeline/train_text_model.py
"""

import json
import math
import random
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "data" / "raw" / "SMSSpamCollection"
OUT_MODEL = ROOT / "lib" / "engine" / "artifacts" / "text_model.json"
OUT_MODEL_TS = ROOT / "lib" / "engine" / "artifacts" / "text_model.ts"
OUT_FIXTURES = ROOT / "lib" / "engine" / "artifacts" / "parity_fixtures.json"
OUT_VAL_SPLIT = ROOT / "lib" / "engine" / "artifacts" / "val_split.json"
OUT_REPORT = ROOT / "reports" / "text_model_evaluation.json"

SEED = 42
VAL_FRACTION = 0.20
MIN_DF = 2
EPOCHS = 25
LR = 0.08
L2 = 1e-5
PLATT_STEPS = 800
PLATT_LR = 0.05
WEIGHT_DECIMALS = 6

# Tokenizer v1 — must stay byte-for-byte compatible with lib/engine/tokenize.ts:
#   1. lowercase
#   2. replace http(s):// or www. URLs with the single token "urltoken"
#   3. split on [a-z0-9]+
URL_RE = re.compile(r"(?:https?://|www\.)\S+")
TOKEN_RE = re.compile(r"[a-z0-9]+")
TOKENIZER_ID = "lower-url-placeholder-v1"


def tokenize(text: str):
    lowered = text.lower()
    lowered = URL_RE.sub(" urltoken ", lowered)
    return TOKEN_RE.findall(lowered)


def sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


def load_corpus():
    """Parse the tab-separated collection, deduplicate identical texts."""
    rows = []
    seen = set()
    dupes = 0
    with open(CORPUS, encoding="latin-1") as fh:
        for line in fh:
            line = line.rstrip("\n")
            if not line:
                continue
            label, _, text = line.partition("\t")
            label = label.strip()
            if label not in ("ham", "spam") or not text:
                continue
            key = text.strip()
            if key in seen:
                dupes += 1
                continue
            seen.add(key)
            rows.append((1 if label == "spam" else 0, text))
    return rows, dupes


def split_stratified(rows, val_fraction: float, rng: random.Random):
    by_label = {0: [], 1: []}
    for label, text in rows:
        by_label[label].append((label, text))
    train, val = [], []
    for label, items in by_label.items():
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_fraction)))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


def build_vocab(train_rows):
    df = {}
    for _, text in train_rows:
        for token in set(tokenize(text)):
            df[token] = df.get(token, 0) + 1
    words = sorted(w for w, c in df.items() if c >= MIN_DF)
    if "urltoken" not in words:
        words.append("urltoken")
        words.sort()
    return {w: i for i, w in enumerate(words)}, words


def featurize(text: str, vocab):
    return sorted({vocab[t] for t in tokenize(text) if t in vocab})


def train_lr(train_rows, vocab, dims: int, rng: random.Random):
    weights = [0.0] * dims
    bias = 0.0
    data = [(label, featurize(text, vocab)) for label, text in train_rows]
    for _ in range(EPOCHS):
        rng.shuffle(data)
        for label, feats in data:
            z = bias + sum(weights[i] for i in feats)
            p = sigmoid(z)
            err = p - label
            for i in feats:
                grad = err + L2 * weights[i]
                weights[i] -= LR * grad
            bias -= LR * err
    return weights, bias


def predict_raw(weights, bias, feats):
    return bias + sum(weights[i] for i in feats)


def platt_fit(logits, labels):
    a, b = 1.0, 0.0
    n = len(logits)
    for _ in range(PLATT_STEPS):
        ga = gb = 0.0
        for z, y in zip(logits, labels):
            p = sigmoid(a * z + b)
            err = p - y
            ga += err * z
            gb += err
        a -= PLATT_LR * ga / n
        b -= PLATT_LR * gb / n
    return a, b


def auc_score(scores, labels):
    pairs = sorted(zip(scores, labels))
    ranks = [0.0] * len(pairs)
    i = 0
    while i < len(pairs):
        j = i
        while j + 1 < len(pairs) and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[k] = avg_rank
        i = j + 1
    pos = sum(labels)
    neg = len(labels) - pos
    if pos == 0 or neg == 0:
        return float("nan")
    rank_sum = sum(r for r, (_, y) in zip(ranks, pairs) if y == 1)
    return (rank_sum - pos * (pos + 1) / 2.0) / (pos * neg)


def ece_score(probs, labels, bins: int = 10):
    total = len(probs)
    ece = 0.0
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        idx = [i for i, p in enumerate(probs) if (lo <= p < hi) or (b == bins - 1 and p == hi)]
        if not idx:
            continue
        conf = sum(probs[i] for i in idx) / len(idx)
        acc = sum(labels[i] for i in idx) / len(idx)
        ece += abs(acc - conf) * len(idx) / total
    return ece


def percentile(values, q):
    vals = sorted(values)
    if not vals:
        return 1.0
    pos = min(len(vals) - 1, max(0, int(math.ceil(q * len(vals))) - 1))
    return vals[pos]


def band_metrics(probs, labels, low, high):
    n = len(probs)
    fpr = 0
    legit = 0
    scam_above = 0
    scams = 0
    hung = 0
    for p, y in zip(probs, labels):
        if low < p < high:
            hung += 1
        if y == 0:
            legit += 1
            if p > low:
                fpr += 1
        else:
            scams += 1
            if p >= high:
                scam_above += 1
    return {
        "false_alarm_rate_above_low_on_genuine": round(fpr / max(1, legit), 6),
        "scam_recall_above_high": round(scam_above / max(1, scams), 6),
        "hung_rate": round(hung / max(1, n), 6),
        "genuine": legit,
        "scams": scams,
    }


def at_threshold(probs, labels, t: float):
    tp = fp = fn = tn = 0
    for p, y in zip(probs, labels):
        pred = 1 if p >= t else 0
        if pred == 1 and y == 1:
            tp += 1
        elif pred == 1 and y == 0:
            fp += 1
        elif pred == 0 and y == 1:
            fn += 1
        else:
            tn += 1
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    acc = (tp + tn) / max(1, tp + tn + fp + fn)
    f1 = 2 * precision * recall / max(1e-12, precision + recall)
    return {
        "precision": round(precision, 6),
        "recall": round(recall, 6),
        "accuracy": round(acc, 6),
        "f1": round(f1, 6),
    }


# Hand-written modern messages included in the parity fixtures so the two
# implementations are proven equal on current-day text, not only on the 2011
# corpus. English only; no verdict claims here — this file tests maths parity.
SYNTHETIC_FIXTURES = [
    ("Your parcel is on hold. Pay the RM1.50 redelivery fee within 24 hours or the item returns to sender: http://poslaju-redeliver.top/pay", 1),
    ("Dear customer, MAYBANK: Your TAC is 483920. Never share this code with anyone, including bank staff.", 0),
    ("Congratulations! You have won RM8,000 in our lucky draw. Claim now at www.claim-now-my.xyz before it expires.", 1),
    ("Hi, this is Dr Lim's clinic. Your appointment on Tuesday 3pm is confirmed. Reply to reschedule.", 0),
    ("Your Touch n Go eWallet is suspended due to unusual activity. Verify your account immediately: https://tng-verify.info", 1),
    ("Thank you for your payment of RM120.00 to Tenaga Nasional. Ref 88213. No action is needed.", 0),
]


def main():
    started = time.time()
    rng = random.Random(SEED)

    rows, dupes = load_corpus()
    train_rows, val_rows = split_stratified(rows, VAL_FRACTION, rng)
    vocab, words = build_vocab(train_rows)
    weights, bias = train_lr(train_rows, vocab, len(words), rng)

    val_logits = []
    val_labels = []
    for label, text in val_rows:
        feats = featurize(text, vocab)
        val_logits.append(predict_raw(weights, bias, feats))
        val_labels.append(label)

    a_cal, b_cal = platt_fit(val_logits, val_labels)
    val_probs = [sigmoid(a_cal * z + b_cal) for z in val_logits]

    auc = auc_score(val_probs, val_labels)
    ece = ece_score(val_probs, val_labels)
    at_half = at_threshold(val_probs, val_labels, 0.5)

    genuine_probs = [p for p, y in zip(val_probs, val_labels) if y == 0]
    scam_probs = [p for p, y in zip(val_probs, val_labels) if y == 1]
    # low  = 99th percentile of genuine scores  -> at most ~1% of honest
    #        messages score above it (false-alarm budget)
    # high = 5th percentile of scam scores     -> at least ~95% of scams
    #        score at or above it (recall target)
    low = percentile(genuine_probs, 0.99)
    high = percentile(scam_probs, 0.05)
    if low > high:
        low = high = (low + high) / 2.0
    low = max(0.05, min(low, 0.95))
    high = max(low, min(high, 0.995))
    band = band_metrics(val_probs, val_labels, low, high)

    top = sorted(range(len(words)), key=lambda i: -weights[i])
    top_scam = [(words[i], round(weights[i], 4)) for i in top[:15]]
    top_genuine = [(words[i], round(weights[i], 4)) for i in top[-15:][::-1]]

    model = {
        "version": 1,
        "tokenizer": TOKENIZER_ID,
        "vocab": words,
        "weights": [round(w, WEIGHT_DECIMALS) for w in weights],
        "bias": round(bias, WEIGHT_DECIMALS),
        "calibration": {"type": "platt", "a": round(a_cal, 8), "b": round(b_cal, 8)},
        "band": {"low": round(low, 6), "high": round(high, 6)},
        "corpus": "UCI SMS Spam Collection (CC BY 4.0)",
    }
    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    model_json = json.dumps(model, separators=(",", ":"), ensure_ascii=False)
    with open(OUT_MODEL, "w", encoding="utf-8") as fh:
        fh.write(model_json)
    with open(OUT_MODEL_TS, "w", encoding="utf-8") as fh:
        fh.write(
            "// Generated by pipeline/train_text_model.py — do not edit by hand.\n"
            "// The same scorer, as a typed module, so the runtime and the tests\n"
            "// import one artefact with no JSON-import interop to get wrong.\n"
            "import type { TextModelArtifact } from \"../textModel\";\n"
            f"export const TEXT_MODEL: TextModelArtifact = {model_json};\n"
            "export default TEXT_MODEL;\n"
        )

    with open(OUT_VAL_SPLIT, "w", encoding="utf-8") as fh:
        json.dump(
            {"note": "held-out evaluation split, seed 42", "rows": [{"label": y, "text": t} for y, t in val_rows]},
            fh,
            separators=(",", ":"),
            ensure_ascii=False,
        )

    fixtures = []
    # Recompute reference scores from the ROUNDED shipped weights so the
    # Python<->TypeScript parity test compares like with like.
    r_w = model["weights"]
    r_b = model["bias"]
    r_a = model["calibration"]["a"]
    r_b2 = model["calibration"]["b"]

    def shipped_score(text):
        feats = featurize(text, vocab)
        z = r_b + sum(r_w[i] for i in feats)
        return z, sigmoid(r_a * z + r_b2)

    ham = [r for r in val_rows if r[0] == 0][:12]
    spam = [r for r in val_rows if r[0] == 1][:12]
    for label, text in ham + spam:
        z, p = shipped_score(text)
        fixtures.append({
            "text": text,
            "source": "uci-val",
            "raw_logit": round(z, 9),
            "calibrated_prob": round(p, 9),
        })
    for text, _ in SYNTHETIC_FIXTURES:
        z, p = shipped_score(text)
        fixtures.append({
            "text": text,
            "source": "synthetic-modern",
            "raw_logit": round(z, 9),
            "calibrated_prob": round(p, 9),
        })
    with open(OUT_FIXTURES, "w", encoding="utf-8") as fh:
        json.dump({"tokenizer": TOKENIZER_ID, "fixtures": fixtures}, fh, separators=(",", ":"))

    report = {
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "corpus": {
            "name": "UCI SMS Spam Collection",
            "license": "CC BY 4.0",
            "messages_total": len(rows) + dupes,
            "duplicates_dropped": dupes,
            "messages_used": len(rows),
            "train": len(train_rows),
            "val": len(val_rows),
        },
        "tokenizer": TOKENIZER_ID,
        "model": {
            "type": "logistic-regression-binary-token-presence",
            "vocab_size": len(words),
            "epochs": EPOCHS,
            "learning_rate": LR,
            "l2": L2,
        },
        "calibration": {"type": "platt", "a": round(a_cal, 8), "b": round(b_cal, 8)},
        "val_metrics": {
            "auc": round(auc, 6),
            "ece_10bin": round(ece, 6),
            **at_half,
        },
        "band": {
            "low": round(low, 6),
            "high": round(high, 6),
            "derivation": "low = 99th percentile of genuine scores (<=1% false alarms above it), high = 5th percentile of scam scores (>=95% scam recall at or above it), both measured on held-out data",
            **band,
        },
        "top_scam_tokens": top_scam,
        "top_genuine_tokens": top_genuine,
        "elapsed_seconds": round(time.time() - started, 2),
    }
    OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_REPORT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print(f"corpus: {len(rows)} messages ({dupes} dupes dropped) -> train {len(train_rows)} / val {len(val_rows)}")
    print(f"vocab: {len(words)} tokens (min df {MIN_DF})")
    print(f"val AUC: {auc:.4f}   ECE: {ece:.4f}   acc@0.5: {at_half['accuracy']:.4f}   P/R: {at_half['precision']:.3f}/{at_half['recall']:.3f}")
    print(f"band: [{low:.4f}, {high:.4f}]  -> false alarms above low: {band['false_alarm_rate_above_low_on_genuine']:.4f}, scam recall above high: {band['scam_recall_above_high']:.4f}, hung: {band['hung_rate']:.4f}")
    print(f"top scam tokens: {[w for w, _ in top_scam[:10]]}")
    print(f"artifacts -> {OUT_MODEL.relative_to(ROOT)}, {OUT_MODEL_TS.relative_to(ROOT)}, {OUT_FIXTURES.relative_to(ROOT)}, {OUT_VAL_SPLIT.relative_to(ROOT)}")
    print(f"report    -> {OUT_REPORT.relative_to(ROOT)}   ({report['elapsed_seconds']}s)")


if __name__ == "__main__":
    main()
