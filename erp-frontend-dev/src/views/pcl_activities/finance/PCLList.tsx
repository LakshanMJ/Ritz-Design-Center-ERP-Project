import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclBankInformationListURL, pclMatchingPOClubListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button, Link, Typography } from '@mui/material';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { pclSummaryDetailsPageURL } from '@/helpers/constants/front_end/FinanceUrls';

const PCLList = ({ mainModalStatus }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [pclSettlementPOClubList, setPclSettlementPOClubList] = useState<any>({})
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchedText, setSearchedText] = useState('');

    const handleCheckboxChange = (id: number) => {
        setCheckedIds((prev) =>
            prev.includes(id) ? prev.filter((checkedId) => checkedId !== id) : [...prev, id]
        );
    };
    const handleTableChange = (page: any) => {
        setCurrentPage(page);
    };
    const handleTableRowsChange = (rows: any) => {
        setRowsPerPage(rows);
    };

    const handleSerchChange = (text: any) => {
        setSearchedText(text);
    };

    const fetchData = () => {
        const requests = [
            api.get(pclBankInformationListURL(currentPage + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchedText)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [poClublist] = respData;
            setPclSettlementPOClubList({...poClublist})

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'PCL No',
            cell: (props) => {
                const displayValue = props.row.original.display_number || '--';
                return <Link component={NextLink} target='_blank' href={pclSummaryDetailsPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>;
            },

        },
        {
            accessorKey: 'total_amount',
            header: 'Total Amount',
            cell(props) {
                return (
                    <>
                        {formatAmount(props?.row?.original?.total_amount)} {props?.row?.original?.total_amount_currency}
                    </>
                );
            },

        },
        {
            accessorKey: 'pcl_threshold_amount',
            header: 'Threshold Amount',
            cell(props) {
                return (
                    <>
                        {formatAmount(props?.row?.original?.pcl_threshold_amount?.amount)} {props?.row?.original?.pcl_threshold_amount_currency}
                    </>
                );
            },

        },
        {
            accessorKey: 'state_display',
            header: 'State',
        }
    ]

    const handlePoClubModal = (checkedIds: any) => {
        mainModalStatus(checkedIds)
    }

    useEffect(() => {
        fetchData()
    }, [currentPage, rowsPerPage, searchedText]);

    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary'>PCL Facilities</Typography>
                    </Box>
                    <Box>
                        {isLoading ? <DefaultLoader /> :
                            <RitzTable
                                data={pclSettlementPOClubList?.results}
                                columns={columns}
                                serverSideRendering={true}
                                onPageNumberChange={handleTableChange}
                                onPerPageCountChange={handleTableRowsChange}
                                onSearchTextChange={handleSerchChange} />
                        }
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLList;
