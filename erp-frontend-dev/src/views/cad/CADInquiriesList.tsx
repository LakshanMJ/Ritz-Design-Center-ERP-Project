import { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import RitzTable from '@/components/Ritz/RitzTable';
import { IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import {PENDING_MATERIALS_VERSION_STATE} from "@/helpers/constants/CostingStates";

const CADInquiriesList = () => {
    const [cadData, setCadData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRouterReady, setIsRouterReady] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const router = useRouter();

    const onChangeTab = (event: string) => {
        // setActiveTab(event);
        const url = {
            pathname: router.pathname,
            query: {...router.query, tab: event}
        }
        router.replace(url, undefined, { shallow: true });
        setIsLoading(true);
        fetchData(event);
    }

    const fetchData = (tab: string) => {
        // console.log('fetch data for tab ', tab)
        let service = RestUrls.getPendingConsumptionRatio();
        if (tab === '2') {
            service = RestUrls.getCompleteConsumptionRatio();
        } else if (tab === '3') {
            service = RestUrls.getUpcomingConsumptionRatio();
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
        // Wait until router is ready to get url params
        if (router.isReady) {
            const tab = router?.query?.tab?.toString() || '1';
            fetchData(tab);
            setIsRouterReady(true);
        }
    }, [router.isReady]);

    useEffect(() => {
        // On url param change
        const tab = router?.query?.tab?.toString();
        if (tab) {
            setActiveTab(tab);
        }
    }, [router]);

    const columns: ColumnDef<any>[] = [
        {
            accessorFn: (row: any) => row.order_inquiry?.id,
            header: 'Order',
            cell: props => (
                <NextLink 
                    target='blank' 
                    href={{
                    pathname: orderSummaryVersionURL(props.row?.original?.order_inquiry?.id, props.row?.original?.id),
                    query: { tab: props.row?.original?.['version_state']?.['value'] == PENDING_MATERIALS_VERSION_STATE ? 1 : 6}}}
                    // onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} TODO Lakshan - fix this
                    // onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    style={{ textDecoration: 'none', color: '#1976D2' }}
                >
                    {props.row?.original?.order_inquiry?.display_number}
                </NextLink>
            ),
            enableColumnFilter: false
        },
        {
            accessorFn: (row: any) => row.order_inquiry?.customer_name,
            header: 'Customer'
        },
        {
            accessorFn: (row: any) => row.order_inquiry?.brand_name,
            header: 'Brand Name'
        },
        {
            accessorFn: (row: any) => row.order_inquiry?.style_number,
            header: 'Style Number',
        }
    ]
    
    return (
        <>
            <Typography variant='h1'>CAD Inquiries</Typography>

            {isRouterReady && <TabContext value={activeTab}>
                <RitzTabs
                    tabs={['Pending', 'Complete', 'Upcoming']}
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

                <RitzTabPanel value='3' sx={{ pt: 2 }}>
                    {isLoading ? <DefaultLoader /> : 
                        <RitzTable
                            title='Upcoming Inquiries'
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