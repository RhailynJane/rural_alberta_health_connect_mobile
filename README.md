# Alberta Health Connect

## Improving Healthcare Access in Rural Alberta

Alberta Health Connect is a mobile application designed to improve access to healthcare information and guidance for residents of rural Alberta. Recognizing the unique challenges faced by these communities, the app provides an AI-powered triage system to help users assess their symptoms, understand their options, and connect with appropriate medical resources.

## Key Features

*   **AI-Powered Triage:** Users input their symptoms through a conversational interface, and the app provides guidance on potential causes and appropriate actions (self-care, contacting a clinic, seeking emergency care).
*   **Rural-Focused:** The app considers the specific challenges of rural Alberta, such as limited access to healthcare facilities, transportation difficulties, and extreme weather conditions.
*   **Secure & Private:** User data is encrypted and stored locally on the device to protect privacy. No data is shared without explicit user consent.
*   **Offline Access:** Core app functionality, including access to the disclaimer and basic triage logic, is available even without an active internet connection.
*   **[Future - Potential] Image Recognition:** Leverages machine learning (YOLOv8) to analyze user-submitted images of symptoms (e.g., rashes, wounds) for enhanced assessment accuracy. *(Currently in development)*


## Target Audience

*   Residents of rural Alberta, particularly those with limited access to healthcare services or transportation options.

## Goals

*   Enhance healthcare information accessibility for rural Albertans.
*   Reduce the burden on emergency rooms and clinics by providing initial guidance for non-emergency conditions.
*   Empower users to make informed decisions about their health and well-being.
*   Improve awareness of available healthcare resources within rural communities.

## Technology Stack

*   Mobile App: [React Native](https://reactnative.dev/) (cross-platform development)
*   Backend: [Convex](https://www.convex.dev/) (Realtime backend as a service)
*   Database: [Convex's built-in data store](https://docs.convex.dev/database)
*   AI/ML: [YOLOv8]

## Why Convex and YOLOv8?

*   **Convex:** We've chosen Convex as our backend for its realtime data synchronization, simplified development, and built-in security and scalability.
*   **YOLOv8:** YOLOv8 is a state-of-the-art object detection model known for its speed and accuracy. We plan to use it to quickly and accurately identify key features in user-submitted images, improving the precision of our symptom assessment. We intend to deploy the model on-device via TensorFlow Lite, to ensure privacy and reduce the requirements for network connectivity.


## License

This project is licensed under the [MIT License](LICENSE) - see the `LICENSE` file for details.

## Code of Conduct

We expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it carefully before participating.

## Ethical Considerations

*   We are committed to providing a safe and ethical healthcare support tool. The app is not a substitute for professional medical advice, diagnosis, or treatment.
*   All user data is handled in accordance with applicable privacy regulations (PIPEDA, HIPAA, Alberta Health regulations).
*   The limitations of the app's AI-powered triage system are clearly communicated to users.
*   Object recognition models will be carefully trained and validated to minimize bias and ensure accurate results.

## Contact

Rhailyn Jane Cona - rhailynjane.cona@edu.sait.ca
Yue Zhou - Yue.Zhou@edu.sait.catest
