import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Box, IconButton, Link, ToggleButton, ToggleButtonGroup } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { allApprovalDetailPageURL, myApprovalDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import NextLink from 'next/link';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import { allCompletedapprovalListURL, approvalEntityURL, myCompletedApprovalListURL } from '@/helpers/constants/RestUrls';
import RitzToggleButtonGroup from '@/components/Ritz/RitzToggleButtonGroup';
import CircularLoader from '@/components/CircularLoader';


const CompletedApprovalList = ({ approvalType }: any) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [completedApprovalList, setCompletedApprovalList] = useState<any>([]);
  const [approvalEntityList, setApprovalEntityList] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchedText, setSearchedText] = useState('');
  const [selectType, setSelectedType] = useState('all');
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);

  const fetchData = () => {
    const selectedUrl = approvalType == 'my_approval' ?
      myCompletedApprovalListURL(currentPage + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchedText, selectType || 'all') :
      allCompletedapprovalListURL(currentPage + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchedText, selectType || 'all')

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
      api.get(approvalEntityURL(approvalType == 'my_approval' ? 'user' : 'admin', 'other'))
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
      header: 'Arroval No',
      cell: props => (
        <Link target="_blank" component={NextLink} href={approvalType == 'my_approval' ? myApprovalDetailPageURL(props.row.original.id) : allApprovalDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
      )
    },
    {
      accessorKey: 'approval_name_display',
      header: 'Approval Type',
    },
    {
      accessorKey: 'created',
      header: 'Created Date',
    },
    {
      accessorKey: 'action_display',
      header: 'Approval Status',
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
    if(approvalType){
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

export default CompletedApprovalList;