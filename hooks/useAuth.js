import { useMutation } from '@tanstack/react-query';
import { checkEmailOrMobile, loginWithPin, registerUser, verifyOtp } from '../utils/auth';

export const useCheckIdentifier = () => {
    return useMutation({
        mutationFn: (identifier) => checkEmailOrMobile(identifier),
    });
};

export const useVerifyOtp = () => {
    return useMutation({
        mutationFn: ({ identifier, otp }) => verifyOtp(identifier, otp),
    });
};

export const useLoginWithPin = () => {
    return useMutation({
        mutationFn: ({ identifier, pin }) => loginWithPin(identifier, pin),
    });
};

export const useRegister = () => {
    return useMutation({
        mutationFn: (data) => registerUser(data),
    });
};
