# Next steps to integrate real inference

This PoC registers `detectObjects(width, height, data)` as a synchronous JSI function from C++.

To extend to a real model inference (ncnn/MNN) you will:

1. Preprocessing on the native side
   - Convert RGBA or YUV frames into the format required by the engine.
   - Reuse pre-allocated buffers to avoid GC pressure.
   - Letterbox / stride / normalized float32 arrays.
2. Inference
   - Load the engine (ncnn or MNN) in native code.
   - Execute inference on the CPU GPU depending on runtime option.
3. Post-processing
   - Decode model outputs, per-class probabilities, filter by conf, NMS, mapping to frame coordinates.
4. Expose a compact result set to JS
   - Minimized payload: [{x1,y1,x2,y2,class,score}, ...]
5. Integrate with VisionCamera frame processors
   - Register the JSI function on initialization.
   - From the VisionCamera frame processor plugin, call into this JSI function with the `frame` buffer (no copy).

Important: use JSI to keep everything fast and minimize bridge crossing. Keep heavy arithmetic in native C++.
