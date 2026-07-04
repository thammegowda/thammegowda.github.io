---
title: "Software"
slug: "software"
layout: "single"
url: "/software/"
ShowToc: false
---

Solving problems with math and computers is still my favourite kind of work.
I started as a software engineer, moved into research, and now find myself writing more code again — partly because AI coding agents make it practical to explore harder, wider engineering problems in parallel.
That has pulled me toward high-performance systems in modern C++ (C++23), CUDA/ROCm kernels, model runtimes, and tooling that turns research ideas into something concrete.
I still care about the older virtues: readable code, tests, documentation, open-source tools, and permissive licenses.

I sometimes participate in [StackOverflow QA threads](https://stackoverflow.com/users/1506477/thamme-gowda).

Here are some of my selected projects:

---

## Tahoma: A C++ Playground for Learning
My personal playground for learning modern GPU systems and experimenting with my own ideas for AI. It's a C++23 project (built on libTorch) where I tinker with training and inference for NMT, LLM, classification, and multimodal models. Current experiments include fused CUDA/ROCm kernels, faster GEMMs, memory-transfer optimizations, CUDA graphs, paged attention, continuous batching, multi-GPU synchronization over NCCL/RCCL rings, faster rollouts for RL training, and low-bit quantization.

- Docs: [docs.gowda.ai/tahoma](https://docs.gowda.ai/tahoma/)

---

## PyMarian: Fast NMT & Evaluation in Python
Python bindings to [Marian NMT](https://marian-nmt.github.io/) (C++) with Intel MKL and NVIDIA CUDA backends; up to 9.5x speedups and ~50% memory reduction versus PyTorch.

- Code: [github.com/marian-nmt/marian-dev](https://github.com/marian-nmt/marian-dev)
- Installer: `pip install pymarian`

---

## SotaStream: Streaming MT Training
A streaming approach to machine translation training for extremely large datasets, with flexible on-the-fly sampling and augmentation.

- Code: [github.com/marian-nmt/sotastream](https://github.com/marian-nmt/sotastream)
- Installer: `pip install sotastream`

---

## RTG: Reader Translator Generator
Neural Machine Translation Toolkit.

- Code: [github.com/isi-nlp/rtg-xt](https://github.com/isi-nlp/rtg-xt)
- Docs: [isi-nlp.github.io/rtg/](https://isi-nlp.github.io/rtg/)
- Installer: [pypi.org/project/rtg/](https://pypi.org/project/rtg/)

---

## MTData: Machine Translation Data
A tool that locates, downloads, and prepares parallel data for machine translation from many data sources.

- Code: [github.com/thammegowda/mtdata](https://github.com/thammegowda/mtdata)
- Installer+Docs: [pypi.org/project/mtdata/](https://pypi.org/project/mtdata/)

---

## NLCodec: Natural Language CoDec
A library to do coding-decoding such as Word, Character, and Byte-Pair-Encoding of natural language text.

- Code: [github.com/isi-nlp/nlcodec/](https://github.com/isi-nlp/nlcodec/)
- Installer+Docs: [pypi.org/project/nlcodec/](https://pypi.org/project/nlcodec/)

---

## awkg: Python `awk`
`awk` like line-processing tool with python as scripting language.

- Code: [github.com/thammegowda/awkg](https://github.com/thammegowda/awkg)
- Installer+Docs: [pypi.org/project/awkg/](https://pypi.org/project/awkg/)

---

## VirtChar: Virtual Characters
Dialog systems that imitate characters from the popular TV show named F.R.I.E.N.D.S.

- Code: [github.com/thammegowda/virtchar](https://github.com/thammegowda/virtchar)
- Dataset: [github.com/thammegowda/dialog-data](https://github.com/thammegowda/dialog-data)
- [Report](https://drive.google.com/file/d/1wfC3xS6MvT2_rvUoJG1DWfyOT2s9Ww_U/view?usp=sharing) and [Presentation](https://drive.google.com/file/d/1C5Vkb0VTj0WZDDWEemDJKJSaVNdMD7TT/view?usp=sharing)

---

## JunkDetect: Junk Detector
A tool to detect junk or not-junk text with support for 100 languages.

- Code: [github.com/thammegowda/junkdetect](https://github.com/thammegowda/junkdetect)
- Installer+Docs: [pypi.org/project/junkdetect/](https://pypi.org/project/junkdetect/)

---

## Sparkler: Spark Crawler
A large scale web crawler on Apache Spark, with Apache Solr backend for crawler database.

- Code: [github.com/uscdatascience/sparkler](https://github.com/uscdatascience/sparkler)
- Docs: [github.com/USCDataScience/sparkler/wiki/sparkler-0.1](https://github.com/USCDataScience/sparkler/wiki/sparkler-0.1)

---

## Auto Extractor
HTML web page clustering tool based on DOM structure and CSS style similarity.

- Code: [github.com/USCDataScience/autoextractor](https://github.com/USCDataScience/autoextractor)
- Docs: [github.com/USCDataScience/autoextractor/wiki](https://github.com/USCDataScience/autoextractor/wiki)
- Paper: [ieeexplore.ieee.org/abstract/document/7785739](https://ieeexplore.ieee.org/abstract/document/7785739)

---

## Supervising UI
A simple web UI for labelling images to be used for image recognition.

- Code: [github.com/USCDataScience/supervising-ui](https://github.com/USCDataScience/supervising-ui)

---

## More Tools
- CoreNLP + Apache Tika: [github.com/thammegowda/tika-ner-corenlp](https://github.com/thammegowda/tika-ner-corenlp)
  - Contributed to Apache Tika: [TikaAndNER](https://cwiki.apache.org/confluence/display/TIKA/TikaAndNER)
- Keras models deployment on JVM using Deeplearning4J: [github.com/USCDataScience/dl4j-kerasimport-examples](https://github.com/USCDataScience/dl4j-kerasimport-examples)
  - Contributed to Apache Tika: [PR #125](https://github.com/apache/tika/pull/125)
- Tensorflow model deployment on JVM using GRPC: [github.com/thammegowda/tensorflow-grpc-java](https://github.com/thammegowda/tensorflow-grpc-java)
- Image Recognition at large scale using Apache Spark: [github.com/thammegowda/tika-dl4j-spark-imgrec](https://github.com/thammegowda/tika-dl4j-spark-imgrec)
- Document Similarity using Apache Spark and Solr: [github.com/thammegowda/solr-similarity](https://github.com/thammegowda/solr-similarity)
- Keyboard layout map of OSX for Kannada (my native language): [github.com/thammegowda/kannada-osx-keylayout](https://github.com/thammegowda/kannada-osx-keylayout)
