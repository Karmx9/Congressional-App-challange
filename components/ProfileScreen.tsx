
import React from 'react';
import { ProfileSettings } from './ProfileSettings';
import { UserProfile } from '../types';

interface ProfileScreenProps {
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ userProfile, setUserProfile }) => {
    return (
        <ProfileSettings 
            userProfile={userProfile} 
            setUserProfile={setUserProfile} 
        />
    );
};

export default ProfileScreen;
