#pragma once

#include <string>
#include <vector>

struct NCNNDetection {
  float x1, y1, x2, y2, score;
  std::string label;
};

class NCNNWrapper {
public:
  NCNNWrapper();
  ~NCNNWrapper();

  // Return true if model loaded
  bool loadModel(const std::string &paramFile, const std::string &binFile);

  // Run forward pass on an RGBA buffer, returns vector of detections
  std::vector<NCNNDetection> forward(const unsigned char *rgba, int width, int height);
};
