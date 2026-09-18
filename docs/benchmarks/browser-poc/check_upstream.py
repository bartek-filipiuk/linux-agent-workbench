"""Run upstream offline contracts without colliding with Browser Use's examples package."""
from pathlib import Path
import sys
import types
import pytest

root = Path(__file__).resolve().parent
examples = types.ModuleType('examples')
examples.__path__ = [str(root / 'vendor/jev-ultrafast/examples')]
sys.modules['examples'] = examples
raise SystemExit(pytest.main([str(root / 'vendor/jev-ultrafast/tests/test_agent.py'), '-q']))
