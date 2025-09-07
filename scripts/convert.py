import pandas as pd
import json
import re
from collections import OrderedDict

SPLIT_RE = re.compile(r'[,;|]+')
NUM_SUFFIX_RE = re.compile(r'\d+$')


def normalize_cell(cell):
    """Clean and lowercase each cell, split if multiple names."""
    s = str(cell).strip().lower()
    if not s or s in ["nan", "none"]:
        return []
    if ',' in s or ';' in s or '|' in s:
        return [p.strip().lower() for p in SPLIT_RE.split(s) if p.strip()]
    return [s]


def build_parent_child_map(df):
    pcm = OrderedDict()
    for _, row in df.iterrows():
        parent = str(row.iloc[0]).strip().lower()
        if not parent or parent in ["nan", "none"]:
            continue
        # collect children
        raw_children = []
        for c in row.iloc[1:]:
            raw_children.extend(normalize_cell(c))
        # remove duplicates but keep order
        seen = set()
        children = []
        for ch in raw_children:
            if ch and ch not in seen:
                seen.add(ch)
                children.append(ch)
        if parent in pcm:
            for ch in children:
                if ch not in pcm[parent]:
                    pcm[parent].append(ch)
        else:
            pcm[parent] = children
    return pcm


def make_node(name, pcm, visited):
    """Recursively build a new node dict, avoiding cycles."""
    if name in visited:
        return {"name": name, "children": []}  # break cycles
    visited.add(name)
    return {
        "name": name,
        "children": [make_node(ch, pcm, visited.copy()) for ch in pcm.get(name, [])]
    }


def build_tree(pcm):
    # roots = parents that never appear as children
    all_children = set(ch for kids in pcm.values() for ch in kids)
    roots = [p for p in pcm.keys() if p not in all_children]
    if not roots:
        roots = list(pcm.keys())  # fallback

    forest = [make_node(r, pcm, set()) for r in roots]
    return forest[0] if len(forest) == 1 else forest


# -----------------------------
# Post-processing transformation
# -----------------------------
def clean_name(name: str) -> str:
    """Remove numeric suffix, capitalize first character."""
    if not name:
        return name
    name = NUM_SUFFIX_RE.sub("", name)  # strip trailing digits
    return name.capitalize()


def transform_names(node):
    """Recursively clean 'name' fields in the JSON tree."""
    node["name"] = clean_name(node["name"])
    for child in node.get("children", []):
        transform_names(child)
    return node


def main():
    # read excel (no header)
    df = pd.read_excel("geneology.xlsx", header=None, dtype=str).fillna("")
    pcm = build_parent_child_map(df)
    tree = build_tree(pcm)

    # apply name cleanup AFTER building the JSON
    if isinstance(tree, list):
        tree = [transform_names(t) for t in tree]
    else:
        tree = transform_names(tree)

    with open("family.json", "w", encoding="utf-8") as f:
        json.dump(tree, f, indent=4, ensure_ascii=False)

    print("✅ Saved family.json")


if __name__ == "__main__":
    main()
