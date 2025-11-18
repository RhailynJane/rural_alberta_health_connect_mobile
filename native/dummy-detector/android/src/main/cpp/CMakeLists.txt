cmake_minimum_required(VERSION 3.10.2)
project(dummy_detector)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17 -fexceptions -frtti")

add_library(dummy-detector SHARED DummyDetector.cpp)

option(USE_NCNN "Build with NCNN library support" OFF)
if (USE_NCNN)
	message(STATUS "NCNN support enabled; you must pass NCNN_LIB and NCNN_INCLUDE or NCNN_ROOT")
	if (DEFINED NCNN_LIB)
		add_library(ncnn STATIC IMPORTED)
		set_target_properties(ncnn PROPERTIES IMPORTED_LOCATION ${NCNN_LIB})
		include_directories(${NCNN_INCLUDE})
		target_link_libraries(dummy-detector ncnn)
	endif()
endif()

add_library(ncnn-wrapper STATIC ncnn_wrapper.cpp)
target_include_directories(ncnn-wrapper PRIVATE ${CMAKE_SOURCE_DIR})
target_link_libraries(dummy-detector ncnn-wrapper)

# React Native required include paths.
# CMAKE_SOURCE_DIR is the directory containing this CMakeLists.txt
# From: native/dummy-detector/android/src/main/cpp/

# Try multiple strategies to find React Native directory
if(DEFINED REACT_NATIVE_DIR)
    # Use provided REACT_NATIVE_DIR if set via gradle
    message(STATUS "Using provided REACT_NATIVE_DIR: ${REACT_NATIVE_DIR}")
else()
    # Calculate from CMake source directory
    # From: native/dummy-detector/android/src/main/cpp/
    # To repo root: go up 6 levels
    get_filename_component(REPO_ROOT "${CMAKE_SOURCE_DIR}/../../../../.." ABSOLUTE)
    set(REACT_NATIVE_DIR "${REPO_ROOT}/node_modules/react-native")
    message(STATUS "Calculated REACT_NATIVE_DIR: ${REACT_NATIVE_DIR}")
endif()

# Verify the directory exists
if(NOT EXISTS "${REACT_NATIVE_DIR}")
    message(FATAL_ERROR "React Native directory not found at: ${REACT_NATIVE_DIR}")
endif()

# Include JSI headers with absolute paths
set(JSI_INCLUDE_DIR "${REACT_NATIVE_DIR}/ReactCommon/jsi")
if(NOT EXISTS "${JSI_INCLUDE_DIR}/jsi/jsi.h")
    message(FATAL_ERROR "JSI header not found at: ${JSI_INCLUDE_DIR}/jsi/jsi.h")
endif()

include_directories("${JSI_INCLUDE_DIR}")
include_directories("${REACT_NATIVE_DIR}/ReactCommon")
include_directories(${CMAKE_SOURCE_DIR})

message(STATUS "JSI include directory: ${JSI_INCLUDE_DIR}")

# Find React Native libraries
find_library(log-lib log)
find_library(jnilib jnigraphics)

# Find React Native packages (prefab)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

target_link_libraries(dummy-detector 
    ReactAndroid::jsi          # JSI API
    ReactAndroid::reactnative  # React Native library
    fbjni::fbjni               # Facebook JNI helpers
    ${log-lib} 
    ${jnilib}
)
