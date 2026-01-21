import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    mobile: '',
    otp: ['', '', '', ''],
    isNewUser: false,
    showTerms: false,
    loginStep: 1, // 1: Mobile/Email, 2: OTP

    setMobile: (mobile) => set({ mobile }),
    setOtp: (otp) => set({ otp }),
    setOtpDigit: (digit, index) => set((state) => {
        const newOtp = [...state.otp];
        newOtp[index] = digit;
        return { otp: newOtp };
    }),
    setIsNewUser: (isNewUser) => set({ isNewUser }),
    setShowTerms: (showTerms) => set({ showTerms }),
    setLoginStep: (step) => set({ loginStep: step }),
    resetAuthStore: () => set({
        mobile: '',
        otp: ['', '', '', ''],
        isNewUser: false,
        loginStep: 1
    }),
}));
