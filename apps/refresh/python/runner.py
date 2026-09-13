import contextlib
import io
import json

import numpy as np


class BoundedOutput(io.StringIO):
    def __init__(self, stream, emit=None):
        super().__init__()
        self.stream = stream
        self.emit = emit
        self.truncated = False

    def write(self, text):
        available = max(0, 8000 - self.tell())
        chunk = text[:available]
        super().write(chunk)
        if self.emit and chunk:
            self.emit(self.stream, chunk)
        if len(text) > available and not self.truncated:
            self.truncated = True
            if self.emit:
                self.emit(self.stream, "\n[Output truncated at 8,000 characters]\n")
        return len(text)


def validate_label(name, context):
    if not isinstance(name, str) or not name.strip() or len(name) > 80:
        raise ValueError(f"{context} labels must be nonempty strings of at most 80 characters")


def export_group(namespace, group):
    exports = namespace.get(group)
    if not isinstance(exports, dict):
        raise ValueError(f"Define {group} as a dictionary of display labels to numeric values; use {{}} for an empty group")
    if len(exports) > 32:
        raise ValueError(f"{group} supports at most 32 displayed values")
    variables = []
    for name, value in exports.items():
        validate_label(name, group)
        array = np.asarray(value)
        if array.dtype.kind not in "iuf" or array.ndim > 2:
            raise ValueError(f"{group}[{name!r}] must be a real numeric scalar, vector, or matrix; got {array.dtype}, shape {array.shape}")
        if not np.isfinite(array).all():
            raise ValueError(f"{group}[{name!r}] must contain only finite values")
        if array.ndim == 0:
            preview = array.reshape(1, 1)
        elif array.ndim == 1:
            preview = array[:12].reshape(1, -1)
        else:
            preview = array[:12, :12]
        variables.append({"name": name, "shape": list(array.shape), "dtype": str(array.dtype),
                          "values": preview.tolist(), "size": int(array.size),
                          "truncated": preview.size != array.size})
    return variables


def export_plots(namespace):
    plots = namespace.get("PLOTS", {})
    if not isinstance(plots, dict) or len(plots) > 12:
        raise ValueError("PLOTS must be a dictionary with at most 12 plots")
    result = []
    total = 0
    for title, series in plots.items():
        validate_label(title, "PLOTS")
        if not isinstance(series, dict) or not 1 <= len(series) <= 8:
            raise ValueError(f"PLOTS[{title!r}] must contain 1 to 8 named series")
        curves = []
        for name, values in series.items():
            validate_label(name, "Plot series")
            shaded = None
            if isinstance(values, dict):
                if set(values) != {"points", "area"}:
                    raise ValueError("Shaded series require points and area")
                region = values["area"]
                if not isinstance(region, dict) or set(region) != {"lower", "upper", "value"}:
                    raise ValueError("Plot area requires lower, upper, and value")
                bounds = np.asarray([region["lower"], region["upper"], region["value"]])
                if bounds.shape != (3,) or bounds.dtype.kind not in "iuf" or not np.isfinite(bounds[:2]).all():
                    raise ValueError("Plot area requires real scalar values and finite bounds")
                shaded = {"lower": float(bounds[0]), "upper": float(bounds[1]),
                          "value": float(bounds[2]) if np.isfinite(bounds[2]) else None}
                values = values["points"]
            array = np.asarray(values)
            if array.dtype.kind not in "iuf" or array.ndim != 2 or array.shape[1] != 2 or not 2 <= len(array) <= 4097:
                raise ValueError(f"Plot series {name!r} must be a real numeric (N, 2) array with 2 to 4097 points")
            if not np.isfinite(array[:, 0]).all():
                raise ValueError(f"Plot series {name!r} must have finite x coordinates")
            total += len(array)
            if total > 100000:
                raise ValueError("PLOTS supports at most 100000 points in total")
            points = [[float(position), float(value) if np.isfinite(value) else None] for position, value in array]
            curve = {"name": name, "points": points}
            if shaded is not None:
                curve["area"] = shaded
            curves.append(curve)
        result.append({"title": title, "series": curves})
    return result


def run_lesson(request):
    namespace = {"__name__": "__lesson__"}
    exec(compile(request["code"], "lesson.py", "exec"), namespace)
    return {"inputs": export_group(namespace, "INPUTS"), "outputs": export_group(namespace, "OUTPUTS"), "plots": export_plots(namespace)}


captured_stdout = BoundedOutput("stdout", globals().get("emit_output"))
captured_stderr = BoundedOutput("stderr", globals().get("emit_output"))
with contextlib.redirect_stdout(captured_stdout), contextlib.redirect_stderr(captured_stderr):
    response = run_lesson(json.loads(payload))
response["stdout"] = captured_stdout.getvalue()
response["stderr"] = captured_stderr.getvalue()
json.dumps(response, allow_nan=False)