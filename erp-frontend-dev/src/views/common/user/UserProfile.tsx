import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

import UserPasswordChange from './UserPasswordChange';
import UserInfo from './UserInfo';

import * as RestUrls from '../../../helpers/constants/RestUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { RitzTabs, RitzTabPanel } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import UserSettings from './UserSettings';

const UserProfile = () => {
    const router = useRouter();
    const [userProfileChange, setUserProfileChange] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('1');

    const getUserDetails = () => {
        const UserDataUrl = RestUrls.userDetailForUserURL();
        api.get(UserDataUrl)
            .then(resp => {
                const resdata = resp?.data || {};
                setUserProfileChange(resdata);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false));
    };

    const tabs = ['User Info', 'Change Password', 'Settings'];

    const handleChange = (event: string) => {
        // setActiveTab(event);
        const url = {
            pathname: router.pathname,
            query: {...router.query, tab: event}
        }
        router.replace(url, undefined, { shallow: true });
    };

    useEffect(() => {
        getUserDetails();
    }, []);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);



    return (
        <>
            <Typography variant='h1'>User Account</Typography>

            {isLoading ? <DefaultLoader/> : 

            <TabContext value={activeTab}>
                <RitzTabs tabs={tabs} activeTab={activeTab} emitChange={handleChange} />
                <RitzTabPanel value='1'>
                    <UserInfo userInfoValues={userProfileChange} />
                </RitzTabPanel>
                <RitzTabPanel value='2'>
                    <UserPasswordChange userInfoValues={userProfileChange} resetPassword={true}/>
                </RitzTabPanel>
                <RitzTabPanel value='3'>
                    <UserSettings/>
                </RitzTabPanel>
            </TabContext>
            }
        </>
    );
};

export default UserProfile;