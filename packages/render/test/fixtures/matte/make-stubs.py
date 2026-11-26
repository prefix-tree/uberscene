"""Two tiny stand-ins for a matting model, for the tests of `uberscene matte`. Run: python3 make-stubs.py

- stub.onnx: alpha is the frame's blue channel (`src` [1,3,H,W] -> `pha` [1,1,H,W]).
- stub-recurrent.onnx: the same, times a counter it carries from frame to frame (`r1i` -> `r1o` = `r1i` + 0.25), so
  the first frame's matte is black and the fifth's whole: a matte that shows whether the state went round.
"""

import onnx
from onnx import TensorProto, helper

def blue(nodes, inits):
    inits += [helper.make_tensor("s", TensorProto.INT64, [1], [2]), helper.make_tensor("e", TensorProto.INT64, [1], [3]),
              helper.make_tensor("ax", TensorProto.INT64, [1], [1])]
    nodes.append(helper.make_node("Slice", ["src", "s", "e", "ax"], ["b"]))

def save(graph, name):
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)], producer_name="uberscene-test")
    model.ir_version = 8
    onnx.checker.check_model(model)
    onnx.save(model, name)

src = helper.make_tensor_value_info("src", TensorProto.FLOAT, [1, 3, "h", "w"])
pha = helper.make_tensor_value_info("pha", TensorProto.FLOAT, [1, 1, "h", "w"])

nodes, inits = [], []
blue(nodes, inits)
nodes.append(helper.make_node("Identity", ["b"], ["pha"]))
save(helper.make_graph(nodes, "stub", [src], [pha], inits), "stub.onnx")

r1i = helper.make_tensor_value_info("r1i", TensorProto.FLOAT, [1, 1, 1, 1])
r1o = helper.make_tensor_value_info("r1o", TensorProto.FLOAT, [1, 1, 1, 1])
nodes, inits = [], []
blue(nodes, inits)
inits += [helper.make_tensor("step", TensorProto.FLOAT, [1], [0.25]), helper.make_tensor("one", TensorProto.FLOAT, [1], [1.0])]
nodes += [
    helper.make_node("Add", ["r1i", "step"], ["r1o"]),
    helper.make_node("Min", ["r1i", "one"], ["k"]),
    helper.make_node("Mul", ["b", "k"], ["pha"]),
]
save(helper.make_graph(nodes, "stub-recurrent", [src, r1i], [pha, r1o], inits), "stub-recurrent.onnx")
