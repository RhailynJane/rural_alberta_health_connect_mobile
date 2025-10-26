import React, { createContext, useContext, useState } from "react";

export interface SignUpFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const defaultValues: SignUpFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
};

const SignUpFormContext = createContext<{
  values: SignUpFormValues;
  setValues: (values: SignUpFormValues) => void;
}>({
  values: defaultValues,
  setValues: () => {},
});

export const useSignUpForm = () => useContext(SignUpFormContext);

export const SignUpFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [values, setValues] = useState<SignUpFormValues>(defaultValues);

  return (
    <SignUpFormContext.Provider value={{ values, setValues }}>
      {children}
    </SignUpFormContext.Provider>
  );
};
