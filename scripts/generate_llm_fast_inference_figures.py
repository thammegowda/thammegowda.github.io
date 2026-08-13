#!/usr/bin/env python3
"""Generate figures for the W4A8 quantization blog post."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Patch
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "static" / "images" / "llm-fast-inference"

BG = "#f7f8f6"
INK = "#19323c"
MUTED = "#65747b"
GRID = "#d7dedc"
TEAL = "#147d73"
BLUE = "#2f76a0"
GOLD = "#dfa72f"
CORAL = "#d95d45"
SOFT_TEAL = "#d8ebe7"
SOFT_BLUE = "#dceaf2"
SOFT_GOLD = "#f5e9c8"
SOFT_CORAL = "#f2ddd7"
NEUTRAL = "#e8ecea"


def configure() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 11,
            "text.color": INK,
            "axes.labelcolor": INK,
            "axes.edgecolor": GRID,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "figure.facecolor": BG,
            "axes.facecolor": BG,
            "savefig.facecolor": BG,
        }
    )


def save(fig: plt.Figure, name: str, dpi: int = 180) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / name, dpi=dpi, bbox_inches="tight", pad_inches=0.18)
    plt.close(fig)


def rounded_box(
    ax: plt.Axes,
    xy: tuple[float, float],
    width: float,
    height: float,
    text: str,
    face: str,
    edge: str,
    fontsize: float = 11,
    weight: str = "bold",
) -> None:
    patch = FancyBboxPatch(
        xy,
        width,
        height,
        boxstyle="round,pad=0.02,rounding_size=0.10",
        linewidth=1.4,
        facecolor=face,
        edgecolor=edge,
    )
    ax.add_patch(patch)
    ax.text(
        xy[0] + width / 2,
        xy[1] + height / 2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        color=INK,
        weight=weight,
        linespacing=1.25,
    )


def arrow(ax: plt.Axes, start: tuple[float, float], end: tuple[float, float], color: str) -> None:
    ax.add_patch(
        FancyArrowPatch(
            start,
            end,
            arrowstyle="-|>",
            mutation_scale=15,
            linewidth=2.0,
            color=color,
            shrinkA=2,
            shrinkB=2,
            connectionstyle="arc3,rad=0",
        )
    )


def generate_pipeline() -> None:
    fig, ax = plt.subplots(figsize=(16, 8.4))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis("off")

    ax.text(0.3, 8.55, "W4A8: 4-bit storage, FP8 compute", fontsize=28, weight="bold")
    ax.text(
        0.3,
        8.05,
        "Asymmetric weights and dynamic rowwise activations meet inside a Hopper mixed-input GEMM",
        fontsize=14,
        color=MUTED,
    )

    ax.text(0.35, 6.9, "STATIC WEIGHT PATH", fontsize=10.5, color=TEAL, weight="bold")
    rounded_box(ax, (0.35, 5.35), 2.2, 1.15, "BF16 / FP32\nlinear weight", SOFT_BLUE, BLUE)
    rounded_box(ax, (3.05, 5.35), 2.2, 1.15, "Groups of 128\nalong K", SOFT_TEAL, TEAL)
    rounded_box(ax, (5.75, 5.35), 2.45, 1.15, "Asymmetric W4\n+ MSE clipping", SOFT_GOLD, GOLD)
    rounded_box(ax, (8.7, 5.35), 2.2, 1.15, "Packed codes\nscale + zero", SOFT_CORAL, CORAL)
    arrow(ax, (2.58, 5.93), (3.0, 5.93), BLUE)
    arrow(ax, (5.28, 5.93), (5.7, 5.93), TEAL)
    arrow(ax, (8.23, 5.93), (8.65, 5.93), GOLD)

    ax.text(0.35, 3.75, "DYNAMIC ACTIVATION PATH", fontsize=10.5, color=BLUE, weight="bold")
    rounded_box(ax, (0.35, 2.2), 2.2, 1.15, "BF16 activation\nrow / token", SOFT_BLUE, BLUE)
    rounded_box(ax, (3.45, 2.2), 2.55, 1.15, "Rowwise amax\nscale = max / 448", SOFT_TEAL, TEAL)
    rounded_box(ax, (6.9, 2.2), 2.45, 1.15, "E4M3 values\n+ FP32 token scale", SOFT_GOLD, GOLD)
    arrow(ax, (2.58, 2.78), (3.4, 2.78), BLUE)
    arrow(ax, (6.03, 2.78), (6.85, 2.78), TEAL)

    rounded_box(ax, (11.65, 3.65), 2.65, 2.25, "MACHETE W4A8\n\nW4 -> E4M3 in registers\nFP8 tensor-core MMA\nFP32 accumulation", "#ffffff", TEAL, 11.5)
    arrow(ax, (10.95, 5.93), (11.6, 5.08), CORAL)
    arrow(ax, (9.4, 2.78), (11.6, 4.12), GOLD)

    rounded_box(ax, (14.75, 4.18), 1.05, 1.15, "BF16\noutput", SOFT_BLUE, BLUE, 11)
    arrow(ax, (14.35, 4.75), (14.7, 4.75), TEAL)

    ax.text(
        0.35,
        0.75,
        "The weights remain 4-bit in HBM. Compute is FP8, not int4 arithmetic.",
        fontsize=13,
        weight="bold",
        color=INK,
    )
    ax.text(
        0.35,
        0.3,
        "Weight asymmetry handles skew; MSE clipping handles outliers; per-token scaling handles changing activation ranges.",
        fontsize=11.5,
        color=MUTED,
    )
    save(fig, "w4a8-pipeline.png")


def quantize_asymmetric(values: np.ndarray, fraction: float) -> tuple[np.ndarray, float, float, float, float]:
    low_observed = float(values.min())
    high_observed = float(values.max())
    center = (low_observed + high_observed) / 2
    half = (high_observed - low_observed) / 2
    low = center - fraction * half
    high = center + fraction * half
    scale = max((high - low) / 15, 1e-8)
    zero = float(np.clip(np.rint(-low / scale), 0, 15))
    codes = np.clip(np.rint(values / scale + zero), 0, 15)
    reconstructed = (codes - zero) * scale
    mse = float(np.mean((values - reconstructed) ** 2))
    return reconstructed, scale, zero, low, mse


def generate_quantizer() -> None:
    rng = np.random.default_rng(66)
    values = np.concatenate([np.clip(rng.normal(0.05, 0.10, 127), -0.30, 0.45), [1.50]])
    values.sort()
    observed_min = float(values.min())
    observed_max = float(values.max())
    bulk_low, bulk_high = np.percentile(values, [5, 95])

    observed_abs = float(np.max(np.abs(values)))
    symmetric_scale = observed_abs / 7
    symmetric_codes = np.clip(np.rint(values / symmetric_scale), -8, 7)
    symmetric_reconstructed = symmetric_codes * symmetric_scale
    symmetric_mse = float(np.mean((values - symmetric_reconstructed) ** 2))
    symmetric_levels = np.arange(-8, 8) * symmetric_scale

    full_rec, full_scale, full_zero, _, full_mse = quantize_asymmetric(values, 1.0)
    candidates = []
    for fraction in np.arange(1.0, 0.49, -0.05):
        result = quantize_asymmetric(values, float(fraction))
        candidates.append((result[-1], float(fraction), result))
    clipped_mse, clipped_fraction, clipped_result = min(candidates, key=lambda item: item[0])
    clipped_rec, clipped_scale, clipped_zero, _, _ = clipped_result
    full_levels = (np.arange(16) - full_zero) * full_scale
    clipped_levels = (np.arange(16) - clipped_zero) * clipped_scale
    clipped_count = int(np.count_nonzero((values < clipped_levels.min()) | (values > clipped_levels.max())))

    fig = plt.figure(figsize=(15.5, 10.0))
    grid = fig.add_gridspec(
        4,
        2,
        width_ratios=(4.8, 1.35),
        height_ratios=(1.1, 1, 1, 1),
        left=0.07,
        right=0.98,
        top=0.84,
        bottom=0.08,
        hspace=0.60,
        wspace=0.20,
    )
    distribution_ax = fig.add_subplot(grid[0, 0])
    search_ax = fig.add_subplot(grid[0, 1])
    code_axes = [fig.add_subplot(grid[row, 0]) for row in range(1, 4)]
    stat_axes = [fig.add_subplot(grid[row, 1]) for row in range(1, 4)]

    fig.suptitle("Same 4 bits, different codebooks", x=0.07, ha="left", fontsize=26, weight="bold")
    fig.text(
        0.07,
        0.895,
        "Top: one illustrative weight block and its clipping search. Bottom: every method on the same code axis q = -8 ... 15.",
        fontsize=13,
        color=MUTED,
    )

    bins = np.linspace(-0.34, 1.54, 39)
    distribution_ax.hist(values, bins=bins, color=INK, alpha=0.80, edgecolor=BG, linewidth=0.8)
    distribution_ax.axvspan(bulk_low, bulk_high, color=SOFT_TEAL, alpha=0.95, zorder=0)
    distribution_ax.axvline(0, color=MUTED, linewidth=1.0, alpha=0.7)
    distribution_ax.annotate(
        "one outlier",
        xy=(1.50, 1),
        xytext=(1.15, 26),
        arrowprops={"arrowstyle": "->", "color": CORAL, "linewidth": 1.5},
        color=CORAL,
        fontsize=10.5,
        ha="center",
    )
    distribution_ax.text(
        (bulk_low + bulk_high) / 2,
        45,
        "90% bulk",
        color=TEAL,
        fontsize=10.5,
        weight="bold",
        ha="center",
    )
    distribution_ax.set_title("Observed block", loc="left", fontsize=14, weight="bold")
    distribution_ax.set_ylabel("count")
    distribution_ax.set_xlim(-1.82, 1.64)
    distribution_ax.set_ylim(0, 55)
    distribution_ax.set_yticks([0, 25, 50])
    distribution_ax.grid(axis="y", color=GRID, linewidth=0.7)
    distribution_ax.spines[["top", "right"]].set_visible(False)

    fractions = np.array([item[1] for item in candidates])
    losses = np.array([item[0] for item in candidates])
    search_ax.plot(fractions, losses, color=CORAL, linewidth=2.2, marker="o", markersize=4.5)
    search_ax.scatter([clipped_fraction], [clipped_mse], s=90, color=TEAL, edgecolor="white", linewidth=1.5, zorder=3)
    search_ax.annotate(
        f"selected f={clipped_fraction:.2f}",
        xy=(clipped_fraction, clipped_mse),
        xytext=(0.63, clipped_mse * 1.65),
        arrowprops={"arrowstyle": "->", "color": TEAL},
        color=TEAL,
        fontsize=9.5,
        weight="bold",
    )
    search_ax.set_title("Per-block range search", loc="left", fontsize=13, weight="bold")
    search_ax.set_xlabel("clip fraction f")
    search_ax.set_ylabel("MSE")
    search_ax.set_xlim(0.48, 1.02)
    search_ax.grid(color=GRID, linewidth=0.7)
    search_ax.spines[["top", "right"]].set_visible(False)

    rows = [
        (
            "1. Naive symmetric",
            np.arange(-8, 8),
            symmetric_levels,
            symmetric_scale,
            symmetric_mse,
            BLUE,
            "15 / 16 reached",
            "signed q = -8 ... 7; -8 unused",
        ),
        (
            "2. Asymmetric, full range",
            np.arange(16),
            full_levels,
            full_scale,
            full_mse,
            TEAL,
            "16 / 16 usable",
            f"unsigned q = 0 ... 15; zero z = {int(full_zero)}",
        ),
        (
            f"3. Asymmetric + MSE clipping (f={clipped_fraction:.2f})",
            np.arange(16),
            clipped_levels,
            clipped_scale,
            clipped_mse,
            CORAL,
            "16 / 16 usable",
            f"unsigned q = 0 ... 15; z = {int(clipped_zero)}; {clipped_count} clipped",
        ),
    ]

    for index, (ax, stat_ax, row) in enumerate(zip(code_axes, stat_axes, rows)):
        title, codes, levels, scale, mse, color, utilization, detail = row
        ax.axvspan(codes.min() - 0.45, codes.max() + 0.45, color=color, alpha=0.12, zorder=0)
        ax.hlines(0.52, codes.min(), codes.max(), color=color, linewidth=3.0, alpha=0.75)
        ax.scatter(codes, np.full_like(codes, 0.52), s=115, color=color, edgecolor="white", linewidth=1.4, zorder=3)
        ax.text(
            -8.35,
            0.92,
            title,
            fontsize=14,
            weight="bold",
            ha="left",
            va="top",
        )
        ax.set_ylim(0, 1)
        ax.set_yticks([])
        ax.set_xlim(-8.8, 15.8)
        ax.set_xticks(np.arange(-8, 16, 1))
        ax.tick_params(axis="x", labelbottom=index == 2, labelsize=8.2)
        ax.grid(axis="x", color=GRID, linewidth=0.7, alpha=0.7)
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)

        stat_ax.axis("off")
        stat_ax.add_patch(
            FancyBboxPatch(
                (0.02, 0.10),
                0.94,
                0.78,
                boxstyle="round,pad=0.02,rounding_size=0.06",
                facecolor="#ffffff",
                edgecolor=color,
                linewidth=1.4,
                transform=stat_ax.transAxes,
            )
        )
        stat_ax.text(0.12, 0.72, utilization, transform=stat_ax.transAxes, fontsize=11, weight="bold", color=color)
        stat_ax.text(0.12, 0.53, detail, transform=stat_ax.transAxes, fontsize=9.2, color=INK)
        stat_ax.text(
            0.12,
            0.34,
            f"maps to w = {levels.min():.2f} ... {levels.max():.2f}",
            transform=stat_ax.transAxes,
            fontsize=9.2,
            color=INK,
        )
        stat_ax.text(0.12, 0.16, f"step {scale:.3f}  ·  MSE {mse:.5f}", transform=stat_ax.transAxes, fontsize=9.2, color=INK)

        if index == 0:
            ax.scatter(
                [-8],
                [0.52],
                s=115,
                facecolor=BG,
                edgecolor=CORAL,
                linewidth=2.0,
                zorder=4,
            )
            ax.axvspan(-8.45, -7.55, color=SOFT_CORAL, alpha=0.95, zorder=1)
            ax.annotate(
                "-8 cannot occur",
                xy=(-8, 0.52),
                xytext=(-5.8, 0.19),
                arrowprops={"arrowstyle": "->", "color": CORAL},
                color=CORAL,
                fontsize=9,
            )
        elif index == 1:
            ax.scatter([full_zero], [0.52], s=180, facecolor="none", edgecolor=INK, linewidth=1.8, zorder=4)
            ax.text(full_zero, 0.82, f"zero z={int(full_zero)}", ha="center", fontsize=9.5, color=INK)
        else:
            ax.scatter([15], [0.52], s=180, facecolor="none", edgecolor=INK, linewidth=1.8, zorder=4)
            ax.annotate(
                "outlier saturates at q=15",
                xy=(15, 0.52),
                xytext=(11.0, 0.84),
                arrowprops={"arrowstyle": "->", "color": CORAL},
                color=CORAL,
                fontsize=9.5,
                ha="center",
            )
    code_axes[-1].set_xlabel("stored 4-bit code q    (one unified axis for signed and unsigned schemes)", fontsize=10.5)
    fig.text(
        0.07,
        0.025,
        "The MSE search includes the clipped outlier's error; it narrows the range only when finer bulk resolution wins overall.",
        fontsize=10.5,
        color=MUTED,
    )
    save(fig, "int4-quantizer-comparison.png")


def generate_bootstrap() -> None:
    metrics = [
        "CometKiwi22",
        "Cometoid",
        "BLEURT20",
        "COMET22",
        "XCOMET-XL",
        "CometKiwi-XXL",
        "MetricX-24-ref",
        "MetricX-24-QE",
        "ChrF2 (segment)",
        "ChrF2 (corpus)",
    ]
    variants = ["FP32", "INT8/BF16", "FP8/FP8", "INT4/BF16", "INT4/FP8", "vLLM NF4"]
    values = np.array(
        [
            [45.3, 22.7, 23.1, 73.0, 10.7, 81.7],
            [41.0, 74.7, 30.0, 41.4, 6.6, 44.8],
            [2.8, 12.6, 49.0, 60.2, 39.8, 4.9],
            [93.3, 60.9, 58.6, 58.7, 89.0, 48.1],
            [6.8, 13.2, 4.2, 35.3, 53.2, 10.1],
            [65.4, 55.4, 21.0, 98.2, 56.0, 99.4],
            [70.1, 70.8, 67.8, 100.0, 100.0, 100.0],
            [79.0, 36.7, 65.7, 100.0, 100.0, 99.9],
            [62.2, 67.4, 98.8, 100.0, 100.0, 100.0],
            [57.1, 81.8, 98.2, 100.0, 100.0, 100.0],
        ]
    )
    categories = np.ones_like(values, dtype=int)
    categories[values < 5] = 0
    categories[values > 95] = 2
    cmap = ListedColormap([BLUE, NEUTRAL, CORAL])

    fig, ax = plt.subplots(figsize=(14.8, 9.0))
    ax.imshow(categories, cmap=cmap, vmin=-0.5, vmax=2.5, aspect="auto")
    ax.set_xticks(np.arange(len(variants)), labels=variants)
    ax.set_yticks(np.arange(len(metrics)), labels=metrics)
    ax.tick_params(axis="x", top=True, labeltop=True, bottom=False, labelbottom=False, pad=8)
    ax.tick_params(axis="y", pad=8)
    for label in ax.get_xticklabels():
        label.set_fontweight("bold")

    for row in range(values.shape[0]):
        for col in range(values.shape[1]):
            value = values[row, col]
            strong = value < 5 or value > 95
            ax.text(
                col,
                row,
                f"{value:.1f}%",
                ha="center",
                va="center",
                fontsize=10.5,
                weight="bold" if strong else "normal",
                color="#ffffff" if strong else INK,
            )

    ax.set_xticks(np.arange(-0.5, values.shape[1], 1), minor=True)
    ax.set_yticks(np.arange(-0.5, values.shape[0], 1), minor=True)
    ax.grid(which="minor", color="#ffffff", linewidth=2.0)
    ax.tick_params(which="minor", bottom=False, left=False)
    for spine in ax.spines.values():
        spine.set_visible(False)

    fig.suptitle("Do the metrics resolve a precision difference?", x=0.12, ha="left", fontsize=24, weight="bold")
    fig.text(
        0.12,
        0.93,
        "Paired-bootstrap support that BF16 receives the better score (S_M)",
        fontsize=13,
        color=MUTED,
    )
    legend = [
        Patch(facecolor=BLUE, label="< 5%: variant scores better than BF16"),
        Patch(facecolor="#f1f2ef", edgecolor=GRID, label="5-95%: unresolved"),
        Patch(facecolor=CORAL, label="> 95%: variant scores worse than BF16"),
    ]
    ax.legend(handles=legend, loc="lower center", bbox_to_anchor=(0.5, -0.15), ncol=3, frameon=False)
    save(fig, "bootstrap-support.png")


def generate_operating_points() -> None:
    categories = ["BF16", "FP8", "4-bit"]
    tahoma_speed = np.array([4486, 6094, 5131])
    vllm_speed = np.array([4917, 5934, 3190])
    tahoma_disk = np.array([23.5, 11.5, 6.7])
    vllm_disk = np.array([23.5, 15.3, 8.4])
    y = np.arange(len(categories))
    height = 0.30

    fig, (speed_ax, disk_ax) = plt.subplots(1, 2, figsize=(16, 7.7), gridspec_kw={"width_ratios": [1.25, 1]})
    fig.subplots_adjust(top=0.78, bottom=0.23, left=0.09, right=0.97, wspace=0.30)
    fig.suptitle("Gemma-3-12B operating points on one H100", x=0.09, ha="left", fontsize=25, weight="bold")
    fig.text(
        0.09,
        0.87,
        "Hot steady-state greedy translation; startup excluded. Quality uncertainty is shown separately in the bootstrap figure.",
        fontsize=12.5,
        color=MUTED,
    )

    speed_ax.barh(y + height / 2, tahoma_speed, height, color=TEAL, label="Tahoma")
    speed_ax.barh(y - height / 2, vllm_speed, height, color=GOLD, label="vLLM")
    speed_ax.set_yticks(y, categories)
    speed_ax.invert_yaxis()
    speed_ax.set_xlabel("generated tokens / second")
    speed_ax.set_title("Throughput (higher is better)", loc="left", fontsize=14, weight="bold")
    speed_ax.grid(axis="x", color=GRID, alpha=0.7)
    speed_ax.set_axisbelow(True)
    speed_ax.set_xlim(0, 6800)
    for row, value in enumerate(tahoma_speed):
        speed_ax.text(value + 80, row + height / 2, f"{value:,}", va="center", fontsize=10.5, color=TEAL, weight="bold")
    for row, value in enumerate(vllm_speed):
        speed_ax.text(value + 80, row - height / 2, f"{value:,}", va="center", fontsize=10.5, color="#9a6d0c", weight="bold")
    ratios = tahoma_speed / vllm_speed
    for row, ratio in enumerate(ratios):
        leader = "Tahoma" if ratio >= 1 else "vLLM"
        displayed = ratio if ratio >= 1 else 1 / ratio
        speed_ax.text(6650, row, f"{leader} {displayed:.2f}x", ha="right", va="center", fontsize=10, color=INK)

    disk_ax.barh(y + height / 2, tahoma_disk, height, color=TEAL)
    disk_ax.barh(y - height / 2, vllm_disk, height, color=GOLD)
    disk_ax.set_yticks(y, categories)
    disk_ax.invert_yaxis()
    disk_ax.set_xlabel("checkpoint size (decimal GB)")
    disk_ax.set_title("Disk footprint (lower is better)", loc="left", fontsize=14, weight="bold")
    disk_ax.grid(axis="x", color=GRID, alpha=0.7)
    disk_ax.set_axisbelow(True)
    disk_ax.set_xlim(0, 27)
    for row, value in enumerate(tahoma_disk):
        disk_ax.text(value + 0.35, row + height / 2, f"{value:.1f}", va="center", fontsize=10.5, color=TEAL, weight="bold")
    for row, value in enumerate(vllm_disk):
        disk_ax.text(value + 0.35, row - height / 2, f"{value:.1f}", va="center", fontsize=10.5, color="#9a6d0c", weight="bold")

    for ax in (speed_ax, disk_ax):
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_visible(False)
        ax.tick_params(axis="y", length=0)
    fig.legend(loc="lower left", bbox_to_anchor=(0.09, 0.07), ncol=2, frameon=False)
    fig.text(
        0.09,
        0.025,
        "This is a comparison of study operating points, not identical arithmetic under two launchers or a general project ranking.",
        fontsize=10.5,
        color=MUTED,
    )
    save(fig, "tahoma-vllm-operating-points.png")


def main() -> None:
    configure()
    generate_pipeline()
    generate_quantizer()
    generate_bootstrap()
    generate_operating_points()
    for path in sorted(OUT_DIR.glob("*.png")):
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()