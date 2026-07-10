import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Box, IconButton, Link } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { allApprovalDetailPageURL, myApprovalDetailPageURL, myTaskDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import NextLink from 'next/link';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import { allCompletedapprovalListURL, allCompletedTaskListURL, myCompletedApprovalListURL, myCompletedTaskListURL, taskEntityURL } from '@/helpers/constants/RestUrls';
import RitzToggleButtonGroup from '@/components/Ritz/RitzToggleButtonGroup';
import CircularLoader from '@/components/CircularLoader';


const CompletedTaskList = ({ taskType }: any) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [completedApprovalList, setCompletedApprovalList] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchedText, setSearchedText] = useState('');
  const [approvalEntityList, setApprovalEntityList] = useState<any>([]);
  const [selectType, setSelectedType] = useState('all');
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);

  const fetchData = () => {
    const selectedUrl = taskType == 'my_tasks' ?
      myCompletedTaskListURL(currentPage + 1, rowsPerPage > 5 ? rowsPerPage : 5, searchedText, selectType || 'all') :
      allCompletedTaskListURL(currentPage + 1, rowsPerPage > 5 ? rowsPerPage : 5, searchedText, selectType || 'all')
    const requests = [
      api.get(selectedUrl),
    ]
    Promise.all(requests).then(response => {
      const [completedApprovalList] = response.map((r: any) => r.data);
      setCompletedApprovalList([...completedApprovalList.results])

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
      setIsLoadingCircularLoader(false)
    });
  }

  const loadEntityDetails = () => {
    const requests = [
      api.get(taskEntityURL(taskType == 'my_tasks' ? 'user' : 'admin', 'other'))
    ]
    Promise.all(requests).then(response => {
      const [entityList] = response.map((r: any) => r.data);
      const convertedEntityList = entityList.map((entity: any) => ({
        count: entity.count,
        id: entity.id,
        display_name: `${entity.name} | ${entity.count}`
      }));
      setApprovalEntityList([...convertedEntityList])

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'display_number',
      header: 'Task No',
      cell: props => (
        <Link target="_blank" component={NextLink} href={taskType == 'my_tasks' ? myTaskDetailPageURL(props.row.original.id) : myTaskDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
      )
    },
    {
      accessorKey: 'approval_name_display',
      header: 'Task Type',
    },
    {
      accessorKey: 'created',
      header: 'Created Date',
    },
    {
      accessorKey: 'task_state_display',
      header: 'Task Status',
    },
  ]
  const handleTableChange = (page: any) => {
    setCurrentPage(page);
  };
  const handleTableRowsChange = (rows: any) => {
    setRowsPerPage(rows);
  };
  
  const handleSerchChange = (text: any) => {
    setSearchedText(text);
  };

  const updateSelectType = (newType: string) => {
    setSelectedType(newType);
  };

  useEffect(() => {
    fetchData()
  }, [selectType, currentPage, rowsPerPage, searchedText]);

  useEffect(() => {
    if(taskType){
      loadEntityDetails()
    }
  }, []);



  return (
    <>
      {isLoadingCircularLoader && (<CircularLoader />)}
      
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
            <Box>
              <RitzToggleButtonGroup
                dataSet={approvalEntityList}
                selectType={selectType}
                onTypeChange={updateSelectType}
              />
            </Box>
            <Box>
              <RitzTable
                data={completedApprovalList}
                columns={columns}
                serverSideRendering={true}
                onPageNumberChange={handleTableChange} 
                onPerPageCountChange={handleTableRowsChange}
                onSearchTextChange={handleSerchChange} />
            </Box>
        </>
      )}
    </>
  );
};

export default CompletedTaskList;