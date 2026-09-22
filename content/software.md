---
title: "Software"
slug: "software"
layout: "single"
url: "/software/"
ShowToc: false
hideMeta: true
---

I build software where research meets real systems: model runtimes, data and training
infrastructure, performance-critical libraries, and tools that make research easier to
reproduce and deploy.

> This is the part of the work I was able to open source. The known unknowns live,
> rather appropriately, in private repositories.

## Current Systems

### Kidi: Local AI in C++ and WebAssembly

I built Kidi, a lightweight C++23 inference toolkit that runs the same model code on
CPU, Apple Metal, and WebAssembly CPU. It supports Gemma 4 E2B text generation and
RTG translation, including the 500-language many-to-English model, without PyTorch
or Transformers at inference time.

Models are ordinary C++ built from reusable tensors and neural layers, with eager
execution and backend-specific operators rather than separate model implementations.
Gemma's original Safetensors checkpoints load directly, including trained mixed
2/4/8-bit mobile-QAT weights, without an offline checkpoint conversion. A measured
macOS arm64 release executable is 8.16 MiB; model weights and runtime memory are separate.

The [experimental browser demo](https://gowda.ai/kidi/) is my first attempt at WebAssembly;
it's still slow at the moment. It runs Gemma locally using WebAssembly SIMD and optional
CPU threads, with **no WebGPU acceleration**.
It supports streaming replies, saved chats, and generation statistics, with prompts
staying on the device. The first run downloads about 2.49 GB of model files,
which are cached for reuse. Use a current 64-bit Chromium browser with ample memory;
the Wasm heap can approach its 4 GiB limit. Chat is currently text-only.

- [Code and native quick start](https://github.com/thammegowda/kidi)
- [Try the experimental browser demo](https://gowda.ai/kidi/)
- [Architecture](https://github.com/thammegowda/kidi/blob/main/ARCHITECTURE.md)
- [Browser requirements and measurements](https://github.com/thammegowda/kidi/blob/main/web/README.md)

### WMT Model Compression: Benchmarking Deployable Systems

I lead the WMT Model Compression shared task, now in its second edition, and build
the open evaluation infrastructure behind it. The WMT25 harness standardized offline
Docker submissions; WMT26 advances to self-contained runnable systems with common
install and inference contracts, sanity checks, reproducibility recipes, organizer-run
execution on controlled H100 hardware, and Pareto analysis across translation quality,
model footprint, GPU memory, and decoding speed.

The second edition received 41 participant-submitted variants from 13 teams. Its forthcoming findings
report shows that precision alone does not determine efficiency: quantization becomes
fast only when the serving runtime is designed to exploit it, and quality must remain
part of the comparison.

- [WMT26 shared task](https://www2.statmt.org/wmt26/model-compression.html)
- [WMT26 findings report](/files/gowda-etal-2026-WMT26-modelzip-findings.pdf)
- [WMT26 evaluation harness](https://github.com/thammegowda/wmt26-model-compression)
- [WMT25 evaluation harness](https://github.com/thammegowda/wmt25-model-compression)

### Tahoma: Low-Bit AI Systems in C++

Tahoma is a C++23 runtime and research platform for training and inference across language,
multimodal, and classification models. Current work includes low-bit quantization,
custom CUDA and ROCm kernels, paged attention, continuous batching, CUDA graphs,
multi-GPU execution over NCCL/RCCL, and faster rollouts for reinforcement learning.
The WMT26 evaluation tests TahomaMT's FP8 and INT4 paths against diverse participant
systems, grounding kernel and runtime work in translation quality rather than throughput alone.

- [Documentation](https://docs.gowda.ai/tahoma/)
- [WMT26 system paper](/files/gowda-2026-wmt26modelzip-tahomamt.pdf)
- [Technical write-up](/posts/2026/08/llm-fast-inference/)

### pigzpp: Fast Compression Across the Stack

A clean-room C++23 rewrite of [pigz](https://zlib.net/pigz/) that became a reusable
compression core for C++, Python, Go, Rust, and WebAssembly. It supports standard
gzip/zlib streams, native ZIP containers, and fast PNG encoding over zlib-ng and
Intel ISA-L backends.

- [Code](https://github.com/thammegowda/pigzpp)
- [Paper](https://arxiv.org/abs/2608.24153)
- [Benchmarks and design](/posts/2026/07/fast-compression/)

### PyMarian: Marian Inference and Evaluation from Python

Python bindings to [Marian NMT](https://marian-nmt.github.io/), connecting its optimized
C++ engine and CPU/CUDA backends to Python workflows. PyMarian supports translation,
COMET-style evaluation, notebooks, and prebuilt model applications while retaining
the performance and memory advantages of Marian.

- [Code](https://github.com/marian-nmt/marian-dev/tree/master/src/python)
- [PyPI](https://pypi.org/project/pymarian/)
- [EMNLP 2024 paper](https://aclanthology.org/2024.emnlp-demo.34/)

## Multilingual AI Infrastructure

### MTData: Reproducible Machine Translation Data

MTData automates locating, downloading, parsing, caching, and citing parallel corpora.
Its versioned recipes make datasets reproducible across experiments.

As a WMT General MT organizer from 2022 through 2026, I have maintained the official
MTData setup for five
consecutive editions: version-pinned recipe files and command-line workflows that let
participants reconstruct the constrained-track training data. The published coverage grew
from 11 WMT22 recipe IDs to 21 WMT26 recipes; later editions added parallel caching,
compressed materialization, corpus statistics, and quality-estimation workflows.

- [Code](https://github.com/thammegowda/mtdata)
- [PyPI](https://pypi.org/project/mtdata/)
- [Documentation and dataset search](https://thammegowda.github.io/mtdata/)
- WMT recipes: [2026](https://www2.statmt.org/wmt26/mtdata/) · [2025](https://www2.statmt.org/wmt25/mtdata/) · [2024](https://www2.statmt.org/wmt24/mtdata/) · [2023](https://www2.statmt.org/wmt23/mtdata/) · [2022](https://www.statmt.org/wmt22/mtdata/index.html)

### NLLB Serve: Multilingual Translation as a Service

A web interface, REST API, and batch decoder for deploying Meta's No Language Left
Behind models across 200 languages. It packages model loading, language handling,
GPU execution, and interactive or programmatic translation behind a small interface.

- [Code](https://github.com/thammegowda/nllb-serve)
- [PyPI](https://pypi.org/project/nllb-serve/)

### RTG and NLCodec: Training, Inference, and Vocabularies

[RTG](https://github.com/isi-nlp/rtg) is a PyTorch-based neural machine translation
toolkit, and [NLCodec](https://github.com/isi-nlp/nlcodec) provides inspectable word,
character, class, and BPE codecs with Python, CLI, and PySpark interfaces. Together
with MTData, they formed the toolchain behind a many-to-English model spanning more
than 500 source languages.

- [RTG documentation](https://isi-nlp.github.io/rtg/)
- [NLCodec documentation](https://isi-nlp.github.io/nlcodec/)
- [ACL 2021 paper](https://aclanthology.org/2021.acl-demo.37/)

### SotaStream: Streaming Training Data

A streaming data pipeline for large-scale machine translation training. SotaStream
builds composable generator graphs for on-the-fly mixing, sampling, filtering, and
augmentation, avoiding rigid preprocessing pipelines and unnecessary materialization
of every experiment variant.

- [Code](https://github.com/marian-nmt/sotastream)
- [Documentation](https://sotastream.readthedocs.io/)
- [NLP-OSS 2023 paper](https://aclanthology.org/2023.nlposs-1.13/)

## Earlier Foundations

### Sparkler: Distributed Web Crawling and Content Analysis

I created Sparkler at USC and designed its core architecture: an extensible web crawler
built around Apache Spark, Kafka, Solr/Lucene, Apache Tika, and distributed JavaScript
rendering. It combined scalable crawling, fault tolerance, near-real-time indexing,
content analysis, and a plugin system. I later handed maintenance to the project team
when I shifted focus to my Ph.D.

- [Code](https://github.com/USCDataScience/sparkler)

## More on GitHub

These are selected projects, not an exhaustive catalog. Smaller experiments, research
artifacts, teaching material, and earlier systems are available in my
[complete list of public GitHub repositories](https://github.com/thammegowda?tab=repositories).

I also participate in [Stack Overflow Q&A](https://stackoverflow.com/users/1506477/thamme-gowda).