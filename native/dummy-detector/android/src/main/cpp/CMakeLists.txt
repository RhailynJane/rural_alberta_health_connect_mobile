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
# Note: Adjust include paths if your RN folder is in a different location.
get_filename_component(REACT_NATIVE_DIR "${CMAKE_SOURCE_DIR}/../../../../.." ABSOLUTE)
include_directories(${REACT_NATIVE_DIR}/node_modules/react-native/ReactCommon/jsi)
include_directories(${CMAKE_SOURCE_DIR})

find_library(log-lib log)
find_library(jnilib jnigraphics)

target_link_libraries(dummy-detector ${log-lib} ${jnilib})
