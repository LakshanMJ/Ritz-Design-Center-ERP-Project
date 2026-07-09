import DefaultLoader from '@/components/DefaultLoader'
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import api from '@/services/api';
import React, { useEffect, useState } from 'react'
import * as RestUrls from '@/helpers/constants/RestUrls';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, Card, Divider, Grid, IconButton, Link, Typography } from '@mui/material';
import NextLink from 'next/link';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { costingOrderEditURL, orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import dayjs from 'dayjs';
import { editOrderProgramUrl } from '@/helpers/constants/front_end/CostingUrls';
import router from 'next/router';
import EditIcon from '@mui/icons-material/Edit';

const ProgramedOrderInquiryList = ({programId}: any) => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Order Inquiry ID',
        },
        {
            accessorKey: 'style_number',
            header: 'Style Number',
            cell: (props) => props.row.original.style_number || '--',
        },
        {
            accessorKey: 'style_description',
            header: 'Description',
            cell: (props) => props.row.original.style_description || '--',
        },
        {
            accessorFn: (row) => (row.date && dayjs(row.date).format('DD/MM/YYYY')),
            header: 'Date',
            cell: (props) => (props.row.original.date ? dayjs(props.row.original.date).format('DD/MM/YYYY') : '--'),
            enableColumnFilter: false,
        },
        {
            accessorKey: '',
            header: 'Country',
            cell: props => {
                const countries = props.row.original.countries
                return (
                <>
                {countries.map((country: any)=> (
                    <Typography key={country.country}>{country.name || '--'}</Typography>
                ))}
                </>
                )
            }
        },
        {
            accessorKey: 'size_category_name',
            header: 'Size Category',
            cell: (props) => props.row.original.size_category_name || '--',
        },
        {
            accessorKey: 'costing_method',
            header: 'Costing Method',
            cell: props => {
                if(props.row.original.costing_method === 'common_price'){
                    return <Typography>Single Price for all Sizes</Typography>
                }else if (props.row.original.costing_method === 'group_by_sizes'){
                    return <Typography>Group by Sizes</Typography>
                }else if (props.row.original.costing_method === 'price_for_each_size'){
                    return <Typography>Individual Price for Each Size</Typography>
                }else{
                    return <Typography>--</Typography>
                }
            }
        },
        {
            accessorKey: 'state',
            header: 'Status', 
            cell: props => {
                const stateValue = props.row.original.state;
                if (stateValue === 'general_information_complete') {
                    return <Typography>General Information Complete</Typography>;
                } else {
                    return <Typography>Open</Typography>;
                }
            }
        },
        {
            accessorFn: (row: any) => row.id,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            header: 'Edit',
            cell: props => {
                const versions = props.row.original.versions
                const firstVersion = versions[0];
              if (firstVersion?.id) {
                return (
                  <Link component={NextLink} href={orderSummaryVersionURL(props.getValue() as any, firstVersion?.id)}>
                    <IconButton size='small' color='primary'><EditIcon fontSize='inherit' /></IconButton>
                  </Link>
                );
              } else {
                return (
                  <Link component={NextLink} href={`/costing/add/${props.getValue()}`}>
                    <IconButton size='small' color='primary'><EditIcon fontSize='inherit' /></IconButton>
                  </Link>
                );
              }
            },
            meta: {
              align: 'center',
              width: 50
            }
          }
    ]

    const [isLoading, setIsLoading] = useState(true);
    const [orderInquiries, setOrderInquiries] = useState<any>([]);

    const getOrderInquiries = () => {
        setIsLoading(true);
        api.get(RestUrls.programOrderInquiriesURL(programId)).then(resp => {
            const resdata = resp?.data || [];
            setOrderInquiries([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if(programId > 0 ){
            getOrderInquiries()
        }
    }, [programId]);

    const orderStates = orderInquiries.map((orderInquiry: any) => orderInquiry.state);
    const isOpen = orderStates.includes('open');
  return (
   <>
   {isLoading ? <DefaultLoader /> : <>
   <RitzBreadcrumbs
        items={[
            { label: 'Order Inquiries', url: '/costing' },
            { label: 'Program Details' }
        ]}
        title={`${programId}`}
    />
    <Card variant='outlined' sx={{ mb: 2 }}>
        <Grid container columnSpacing={2} px={2}>
            <Grid item sm={3} xs={2}>
                <dl>
                    <dt>Customer</dt>
                    <dd>{orderInquiries[0].customer_name || '--'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={3} xs={2}>
                <dl>
                    <dt>Brand</dt>
                    <dd>{orderInquiries[0].brand_name || '--'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={3} xs={2}>
                <dl>
                    <dt>Season</dt>
                    <dd>{orderInquiries[0].season_name || '--'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={2} xs={2}>
                <dl>
                    <dt>Year</dt>
                    <dd>{orderInquiries[0].year || '--'}</dd>
                </dl>
            </Grid>
        </Grid>
    </Card>
    <Box>
    <RitzTable 
    data={orderInquiries}
    columns={columns}
    />
    </Box>
   </>}
   </>
  )
}

export default ProgramedOrderInquiryList