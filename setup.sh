#!/usr/bin/env bash
# cretaed by Thamme Gowda on 2024-09-06
# This script sets up the environment for the project

set -eux
MYDIR=$(dirname $0)

# Install dependencies
ENV_NAME="pelican"

CONDA=
# prefer mamba if it is installed, otherwise use conda
# if neither is installed, exit with error
if [[ $(which mamba) ]]; then
    CONDA=mamba
    echo "Using mamba"
elif [[ $(which conda) ]]; then
    CONDA=conda
    echo "Using conda"
else
    echo "Error: neither  mamba nor conda is installed. Please install one of them."
    exit 1
fi

# step1: check if  env exists. if not create it
if [[ $($CONDA env list | grep $ENV_NAME) ]]; then
    echo "Environment $ENV_NAME already exists."
else
    echo "Creating environment $ENV_NAME"
    $CONDA env create -y -f $MYDIR/environment.yml
fi



# clone submodule recursively if not already cloned
if [[ ! -d $MYDIR/pelican-plugins ]]; then
    git submodule update --init --recursive --depth 1
fi

# if pelican-bibtex is not already cloned, clone it 
if [[ ! -d $MYDIR/pelican-plugins/pelican-bibtex ]]; then
    git clone https://github.com/vene/pelican-bibtex pelican-plugins/pelican-bibtex
fi

# if which python is not from the env, then activate the env
if [[ $(which python) != $(conda run -n $ENV_NAME which python) ]]; then
    echo "Activating environment $ENV_NAME"
    conda activate $ENV_NAME
fi