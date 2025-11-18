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
# To repo root: go up 6 levels
get_filename_component(REPO_ROOT "${CMAKE_SOURCE_DIR}/../../../../.." ABSOLUTE)
set(REACT_NATIVE_DIR "${REPO_ROOT}/node_modules/react-native")

# Include JSI headers
include_directories("${REACT_NATIVE_DIR}/ReactCommon/jsi")
include_directories("${REACT_NATIVE_DIR}/ReactCommon")
include_directories(${CMAKE_SOURCE_DIR})

find_library(log-lib log)
find_library(jnilib jnigraphics)

target_link_libraries(dummy-detector ${log-lib} ${jnilib})
