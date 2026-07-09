import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box} from '@mui/material';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import PendingTaskList from './PendingTaskList';
import CompletedTaskList from './CompletedTaskList';


const Tasks= ({ taskType }: any) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    router.replace(url, undefined, { shallow: true });
  };

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <TabContext value={activeTab}>
             <Box sx={{ display: 'flex', alignItems: 'center', }}>
              <RitzTabs tabs={['Pending Tasks', 'Completed Tasks']} activeTab={activeTab} emitChange={handleChangeTabs} />
            </Box>
            <RitzTabPanel value='1' sx={{ pt: 2 }}>
                <PendingTaskList taskType={taskType} />
            </RitzTabPanel>
            <RitzTabPanel value='2' sx={{ pt: 2 }}>
                <CompletedTaskList taskType={taskType}  />
            </RitzTabPanel>
          </TabContext>
        </>
      )}
    </>
  );
};

export default Tasks;