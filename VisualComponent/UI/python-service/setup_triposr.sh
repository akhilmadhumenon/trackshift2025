#!/bin/bash

# Setup script for TripoSR installation
# This script installs TripoSR and its dependencies

echo "Setting up TripoSR for F1 Tyre Visual Difference Engine..."

# Install base requirements first
echo "Installing base requirements..."
pip install -r requirements.txt

# Clone and install TripoSR from GitHub
echo "Installing TripoSR from GitHub..."
pip install git+https://github.com/VAST-AI-Research/TripoSR.git

# Download TripoSR model weights (optional - will auto-download on first use)
echo "TripoSR will download model weights automatically on first use"
echo "Model: stabilityai/TripoSR (~1.5GB)"

echo "Setup complete!"
echo ""
echo "Note: TripoSR requires significant computational resources."
echo "- GPU (CUDA): Recommended for production use"
echo "- Apple Silicon (MPS): Supported on M1/M2/M3 Macs"
echo "- CPU: Fallback option (very slow)"
