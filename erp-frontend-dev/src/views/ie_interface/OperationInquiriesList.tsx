import { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import RitzTable from '@/components/Ritz/RitzTable';
import { IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
// import { orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const CADInquiriesList = () => {
    const [cadData, setCadData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRouterReady, setIsRouterReady] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const router = useRouter();

    const onChangeTab = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
        setIsLoading(true);
        fetchData(event);
    }

    const fetchData = (tab: string) => {
        let service = RestUrls.getPendingOperationInquiries();
        if (tab === '2') {
            service = RestUrls.getCompleteOperationInquiries();
        }
        api.get(service).then(resp => {
            const respData = (resp?.data || []).sort((a: any, b: any) => b?.id - a?.id);
            setCadData([...respData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).then(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (router.isReady) {
            const tab = router?.query?.tab?.toString() || '1';
            fetchData(tab);
            setIsRouterReady(true);
        }
    }, [router.isReady]);

    useEffect(() => {
        const tab = router?.query?.tab?.toString();
        if (tab) {
            setActiveTab(tab);
        }
    }, [router]);

    const columns: ColumnDef<any>[] = [
        {
            accessorFn: (row: any) => row.order_id,
            header: 'Costing ID',
            enableColumnFilter: false
        },
        {
            accessorFn: (row: any) => row.id,
            header: 'Version ID',
        },
        {
            accessorFn: (row: any) => row.name,
            header: 'Version Name',
        },
        {
            accessorFn: (row: any) => row.customer,
            header: 'Customer'
        },
        {
            accessorFn: (row: any) => row.brand,
            header: 'Brand Name'
        },
        {
            accessorFn: (row: any) => row.style,
            header: 'Style Number',
        },
        {
            accessorFn: (row: any) => row.order_id,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            header: 'Edit',
            cell: props => (
                <NextLink href={{
                    // pathname: orderSummaryVersionURL(props.row?.original?.order_id, props.row?.original?.id),
                    pathname: `/ie_interface/operation_inquiries/${props.row?.original?.order_id}/${props.row?.original?.id}`,
                    query: { tab: 4 }
                }}>
                    <IconButton size='small' color='primary'><EditIcon fontSize='inherit' /></IconButton>
                </NextLink>
            ),
            meta: {
                align: 'center',
                width: 50
            }
        }
    ]

    return (
        <>
            <Typography variant='h1'>Operation Inquiries</Typography>

            {isRouterReady && <TabContext value={activeTab}>
                <RitzTabs
                    tabs={['Pending', 'Complete']}
                    activeTab={activeTab}
                    emitChange={onChangeTab}
                    disabled={isLoading}
                />

                <RitzTabPanel value='1' sx={{ pt: 2 }}>
                    {isLoading ? <DefaultLoader /> :
                        <RitzTable
                            title='Pending Inquiries'
                            data={cadData}
                            columns={columns}
                            border={false}
                        />
                    }
                </RitzTabPanel>

                <RitzTabPanel value='2' sx={{ pt: 2 }}>
                    {isLoading ? <DefaultLoader /> :
                        <RitzTable
                            title='Complete Inquiries'
                            data={cadData}
                            columns={columns}
                            border={false}
                        />
                    }
                </RitzTabPanel>


            </TabContext>}
        </>
    )
}

export default CADInquiriesList;