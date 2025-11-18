cmake_minimum_required(VERSION 3.10.2)
project(dummy_detector)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -fexceptions -frtti")

add_library(dummy-detector SHARED DummyDetector.cpp)

# React Native required include paths.
# Note: Adjust include paths if your RN folder is in a different location.
get_filename_component(REACT_NATIVE_DIR "${CMAKE_SOURCE_DIR}/../../../../.." ABSOLUTE)
include_directories(${REACT_NATIVE_DIR}/node_modules/react-native/ReactCommon/jsi)

find_library(log-lib log)
find_library(jnilib jnigraphics)

target_link_libraries(dummy-detector ${log-lib} ${jnilib})
