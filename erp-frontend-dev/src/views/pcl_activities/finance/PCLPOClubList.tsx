import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclMatchingPOClubListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button,Link } from '@mui/material';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import Checkbox from '@mui/material/Checkbox';

const PCLPOClubList = ({ mainModalStatus }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [pclSettlementPOClubList, setPclSettlementPOClubList] = useState<any>([])
    const [checkedIds, setCheckedIds] = useState<number[]>([]);

    const handleCheckboxChange = (id: number) => {
        setCheckedIds((prev) =>
            prev.includes(id) ? prev.filter((checkedId) => checkedId !== id) : [...prev, id]
        );
    };

    const fetchData = () => {
        const requests = [
            api.get(pclMatchingPOClubListURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [poClublist] = respData;
            setPclSettlementPOClubList([...poClublist])

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getRowModel().rows.every((row) => checkedIds.includes(row.original.id))}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setCheckedIds(table.getRowModel().rows.map((row) => row.original.id));
                        } else {
                            setCheckedIds([]);
                        }
                    }}
                />
            ),
            cell: (props: any) => (
                <Checkbox
                    checked={checkedIds.includes(props.row.original.id)}
                    onChange={() => handleCheckboxChange(props.row.original.id)}
                />
            ),
            meta: {
                align: 'center',
                width: 35
            },
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
        },
        {
            accessorKey: 'po_club',
            header: 'PO Club',
            cell(props) {
                return (
                    <>
                        <Link>{props?.row?.original?.display_number}</Link>
                    </>
                );
            },

        },
        {
            accessorKey: 'fob_total_value.amount',
            header: 'Total FOB Value',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.fob_total_value.amount} {props?.row?.original?.fob_total_value.amount_currency_display}
                    </>
                );
            },

        },
        {
            accessorKey: 'max_pcl_value.amount',
            header: 'Max PCL Value',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.max_pcl_value.amount} {props?.row?.original?.max_pcl_value.amount_currency_display}
                    </>
                );
            },

        },
        {
            accessorKey: 'pcl_used_amount.amount',
            header: 'Used Amount',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.pcl_used_amount.amount} {props?.row?.original?.pcl_used_amount.amount_currency_display}
                    </>
                );
            },

        },
        {
            accessorKey: 'pcl_available_amount.amount',
            header: 'Available Amount',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.pcl_available_amount.amount} {props?.row?.original?.pcl_available_amount.amount_currency_display}
                    </>
                );
            },

        },
        {
            accessorKey: 'fob_presentage',
            header: 'FOB Presentage ',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.fob_presentage} %
                    </>
                );
            },
        },
    ]

    const handlePoClubModal = (checkedIds: any) => {
        mainModalStatus(checkedIds)
    }

    useEffect(() => {
        fetchData()
    }, []);

    return (
        <>
            
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        {isLoading ? <DefaultLoader /> :
                            <RitzTable
                                data={pclSettlementPOClubList}
                                columns={columns}
                                pagination={false}
                                enableGlobalFilter={false}
                                enableColumnFilter={false}
                            />
                        }
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button variant="contained" color="primary" onClick={() => { handlePoClubModal(checkedIds) }} size="small" sx={{ mt: 1 }}>Next</Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLPOClubList;
