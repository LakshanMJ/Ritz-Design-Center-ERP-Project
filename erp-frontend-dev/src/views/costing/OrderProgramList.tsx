import DefaultLoader from '@/components/DefaultLoader'
import RitzTable from '@/components/Ritz/RitzTable';
import { IconButton, Link, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import * as RestUrls from '@/helpers/constants/RestUrls';
import api from '@/services/api';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import EditIcon from '@mui/icons-material/Edit';
import { editOrderProgramUrl } from '@/helpers/constants/front_end/CostingUrls';

const OrderProgramList = () => {

    const columns: ColumnDef<any>[] = [
		{
            accessorKey: 'display_number',
            header: 'Program',
        },
		{
            accessorKey: 'number_of_orders',
            header: 'Order Inquiry Count',
			cell(props) {
				return <Typography>{props.row.original.number_of_orders > 0 ? props.row.original.number_of_orders : '0'}</Typography>
			},
        },
		{
            accessorKey: 'year',
            header: 'Year',
        },
		{
            accessorKey: 'customer_name',
            header: 'Customer',
        },
		{
            accessorKey: 'brand_name',
            header: 'Brand',
        },
		{
            accessorKey: 'season_name',
            header: 'Season',
        },
        {
            accessorFn: (row: any) => row.id,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            header: 'Edit',
            cell: props => {
                return (
                  <Link component={NextLink} href={editOrderProgramUrl(props.row.original.id)}>
                    <IconButton size='small' color='primary'><EditIcon fontSize='inherit' /></IconButton>
                  </Link>
                );
            },
            meta: {
              align: 'center',
              width: 50
            }
          }
	]

    const [isLoading, setIsLoading] = useState(true);
    const [programes, setProgrames] = useState<any>([]);

    const getProgrames = () => {
        setIsLoading(true);
        api.get(RestUrls.OrderProgramsURL()).then(resp => {
            const respData = resp?.data || [];
            respData.sort((a: any, b: any) => b.id - a.id);
            setProgrames([...respData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

useEffect(() => {
	getProgrames()
}, [])

	
  return (
	<>
	<Typography variant='h1'>Program List</Typography>
	{isLoading ? <DefaultLoader /> : <>
	<RitzTable
	    data={programes}
	    columns={columns}
	/>
    </>}
	</>
  )
}

export default OrderProgramList