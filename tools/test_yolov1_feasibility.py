#!/usr/bin/env python3
"""Dependency-free tests for the YOLOv1 export acceptance gate."""

import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "yolov1_feasibility.py"
SPEC = importlib.util.spec_from_file_location("yolov1_feasibility", SCRIPT)
feasibility = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(feasibility)


class GoldenLabelsTest(unittest.TestCase):
    def assert_rejected(self, labels):
        with self.assertRaisesRegex(RuntimeError, "INT8 ONNX golden changed:"):
            feasibility.require_golden_labels(labels, "INT8 ONNX")

    def test_canonical_labels_are_accepted(self):
        self.assertIsNone(
            feasibility.require_golden_labels(["bicycle", "car", "dog"], "INT8 ONNX")
        )

    def test_extra_labels_are_allowed(self):
        self.assertIsNone(
            feasibility.require_golden_labels(
                ["person", "dog", "bicycle", "car"], "INT8 ONNX"
            )
        )

    def test_empty_labels_are_rejected(self):
        self.assert_rejected([])

    def test_missing_bicycle_is_rejected(self):
        self.assert_rejected(["car", "dog"])

    def test_missing_car_is_rejected(self):
        self.assert_rejected(["bicycle", "dog"])

    def test_missing_dog_is_rejected(self):
        self.assert_rejected(["bicycle", "car"])


if __name__ == "__main__":
    unittest.main()
