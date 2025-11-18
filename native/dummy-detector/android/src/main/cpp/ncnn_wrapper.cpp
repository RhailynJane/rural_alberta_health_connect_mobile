#include "ncnn_wrapper.h"

#ifdef USE_NCNN
#include <net.h>
#include <vector>

NCNNWrapper::NCNNWrapper() {}
NCNNWrapper::~NCNNWrapper() {}

bool NCNNWrapper::loadModel(const std::string &paramFile, const std::string &binFile) {
  try {
    m_net.load_param(paramFile.c_str());
    m_net.load_model(binFile.c_str());
    return true;
  } catch (...) {
    return false;
  }
}

std::vector<NCNNDetection> NCNNWrapper::forward(const unsigned char *rgba, int width, int height) {
  std::vector<NCNNDetection> detections;
  // Placeholder logic: real code will convert RGBA to ncnn::Mat, run nets, and decode
  // For now, stub returns empty vector
  return detections;
}

#else

NCNNWrapper::NCNNWrapper() {}
NCNNWrapper::~NCNNWrapper() {}

bool NCNNWrapper::loadModel(const std::string &paramFile, const std::string &binFile) {
  // NCNN not available in this build; return false
  (void)paramFile; (void)binFile; return false;
}

std::vector<NCNNDetection> NCNNWrapper::forward(const unsigned char *rgba, int width, int height) {
  (void)rgba; (void)width; (void)height;
  return {};
}

#endif
