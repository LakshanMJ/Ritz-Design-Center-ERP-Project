import React, {useEffect, useState} from 'react'
import * as grnUrls from '@/helpers/constants/rest_urls/GrnUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import {getDefaultError} from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import RitzTable from '@/components/Ritz/RitzTable';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Box, Grid, IconButton, Link, Table, TableBody, TableCell, TableFooter, TableHead, TablePagination, TableRow, Tooltip, Typography } from '@mui/material';
import {FABRIC_MATERIAL} from "@/helpers/costings/materials/MaterialFieldHelper";
import {createdGrnDetailsPageURL} from "@/helpers/constants/front_end/GrnUrls";
import InfoIcon from '@mui/icons-material/Info';
import PieChart from '@/components/Charts/PieChart';
import DoughnutChart from "@/components/Charts/DougnutChart";
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const POClubGrnDetailView = (clubId: any) => {

    const inHouseMaterialColumns = [
        {
            accessorKey: "id",
            header: '',
            cell: ({row}: any) => (
                <span style={{paddingLeft: `${row.depth * 2}rem`}}>
              <Box sx={{display: "flex", alignItems: "center"}}>
                <IconButton
                    size="small"
                    onClick={() => handleRowExpand(row)}
                    style={{cursor: "pointer"}}
                >
                  {row.getIsExpanded() ? (
                      <KeyboardArrowDownIcon/>
                  ) : (
                      <KeyboardArrowRightIcon/>
                  )}
                </IconButton>
              </Box>
            </span>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                align: "left",
            }
        },
        {
            header: 'Material',
            accessorFn: (row: any) => row?.material_details?.material_label
        },
        {
            header: 'Ritz Reference Code',
            cell: ({ row }: any) => {
                const materialHeaders = row?.original?.[headersKey];
                const materialDetails = row?.original?.[materialDetailsKey];
                return (
                    <>
                  <Box sx={{display: 'flex', flexDirection: 'row'}}>
                  <Typography sx={{mr: 1}}>{row?.original?.material_details?.ritz_customer_brand_reference_code}</Typography>
                    <Tooltip arrow title={
                         <Box>
                               {materialHeaders.map((header: any, headerIndex: number) => (
                                   <Typography key={headerIndex}>{header.label} : {materialDetails[header.value]}</Typography>
                               ))}
                              </Box>
                    }>
                        <InfoIcon fontSize="small" sx={{opacity: '60%'}}/>
                    </Tooltip>
                  </Box>
                    </>
                );
            },
        },
        {
            header: 'Required Quantity',
            accessorFn: (row: any) => `${row?.required_quantity?.quantity || 'N/A'} ${row?.required_quantity?.quantity_units_display || ''}`
        },
        {
            header: 'Available Quantity',
            accessorFn: (row: any) => `${row?.filled_quantity?.quantity || '0'} ${row?.filled_quantity?.quantity_units_display || ''}`
        },
        {
            header: 'Pie Chart',
            accessorKey: 'pieChart',
            cell: ({ row }: any) => {
                const requiredQuantity = row?.original?.required_quantity?.quantity;
                const availableQuantity = row?.original?.filled_quantity?.quantity;
                let quantityGap;

                if (requiredQuantity > availableQuantity) {
                    quantityGap = requiredQuantity - availableQuantity
                } else {
                    quantityGap = 0
                }

                return (
                    <>
                        <span style={{ paddingLeft: `${row.depth * 2}rem`}}>
                            <Box style={{ width: '150px', height: '150px' }}>
                                <DoughnutChart
                                    labels={['Available Quantity', 'Pending Delivery Quantity']}
                                    data={[
                                        availableQuantity, quantityGap
                                    ]}
                                    measuringUnit={row?.original?.required_quantity?.quantity_units_display}
                                    isUseRandomColors={false}
                                    predefinedColors={['#508D69','#800000']}
                                    boxWrapperStyle={{width: '150px', height: '150px' }}
                                />
                            </Box>
                        </span>
                    </>
                );
            },
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                align: 'left',
            },
        }
    ]

    const materialSubRowHeaders = [
        {
            header: 'GRN Number',
            accessorFn: (row: any) => row?.grn_number
        },
        {
            header: 'Purchase Order',
            accessorFn: (row: any) =>
                row?.purchase_order_id ? (
                    <Link href={purchaseOrderDetailPageURL(row?.purchase_order_id)} target={'_blank'}>{row?.purchase_order_display_number}</Link>
                ) : (
                    "N/A"
                )
        },
        {
            header: 'Barcode',
            accessorFn: (row: any) => row?.barcode
        },
        {
            header: 'Allocated Quantity',
            accessorFn: (row: any) => `${row?.allocated_quantity} ${row?.allocated_quantity_units}`
        },
    ]

    const fabricSubRowHeaders = [
        {
            header: 'GRN Number',
            accessorFn: (row: any) =>
                        row?.supplier_po_grn_id ? (
                            <Link href={createdGrnDetailsPageURL(row?.supplier_po_grn_id)} target={'_blank'}>GRN {row?.supplier_po_grn_id}</Link>
                        ): (
                            "N/A"
                        )
        },
        {
            header: 'Purchase Order',
            accessorFn: (row: any) =>
                row?.purchase_order_id ? (
                    <Link href={purchaseOrderDetailPageURL(row?.purchase_order_id)} target={'_blank'}>{row?.purchase_order_display_number}</Link>
                ) : (
                    "N/A"
                )
        },
        {
            header: 'Barcode',
            accessorFn: (row: any) => row?.barcode
        },
        {
            header: 'Batch Number',
            accessorFn: (row: any) => row?.batch_number
        },
        {
            header: 'Pack Number',
            accessorFn: (row: any) => row?.pack_number
        },
        {
            header: 'Width',
            accessorFn: (row: any) => row?.width
        },
        {
            header: 'Shade',
            accessorFn: (row: any) => row?.shade
        },
        {
            header: 'Quantity',
            accessorFn: (row: any) => `${row?.allocated_quantity} ${row?.allocated_quantity_units}`
        },

    ]

    const grnHeadersKey = 'grn_headers'
    const dataKey = 'data';
    const customerBrandMaterialIdKey = 'customer_brand_material_id';
    const headersKey = 'headers'
    const materialDetailsKey = 'material_details';

    const [grnData, setGrnData] = useState<any>({[grnHeadersKey]: [], supplierPoGrnNaterialDataKey: []});
    const [subRowData, setSubRowData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    const [pagination, setPagination] = useState<any>({ tablePageNumber: {}, tableRowsPerPage: {} });

    const handleChangePage = (event: unknown, newPage: number, expandedRowIndex: number) => {
        setPagination((prevState: { tablePageNumber: any; }) => ({
            ...prevState,
            tablePageNumber: {
                ...prevState.tablePageNumber,
                [expandedRowIndex]: newPage
            }
        }));
    };

    const handleChangeRowsPerPage = (event: any, tableIndex: number) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setPagination((prevState: { tableRowsPerPage: any; tablePageNumber: any; }) => ({
            ...prevState,
            tableRowsPerPage: {
                ...prevState.tableRowsPerPage,
                [tableIndex]: newRowsPerPage
            },
            tablePageNumber: {
                ...prevState.tablePageNumber,
                [tableIndex]: 0
            }
        }));
    };

    useEffect(() => {
        fetchData()
    }, [clubId]);


    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    };

    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const fetchData = () => {
        api.get(grnUrls.clubBOMMaterialDetailsUrl(clubId.clubId)).then(response => {
            const responseData = response?.data || [];
            setGrnData(responseData)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false))
    }

    const fetchSubRowData = (customerBrandMaterialId: any, RowIndex: number) => {
        const subRowDetailUrl = grnUrls.clubInHouseMaterialDetailsUrl(clubId.clubId as number, customerBrandMaterialId as number);
        api.get(subRowDetailUrl).then(response => {
            const responseData = response?.data?.['details'] || [];
            const data = {...subRowData, [customerBrandMaterialId]: [...responseData]}
            setSubRowData(data);
            //make the expanded table page number as 0
            setPagination((prevState: { tablePageNumber: any; }) => ({
                ...prevState,
                tablePageNumber: {
                    ...prevState.tablePageNumber,
                    [RowIndex]: 0
                }
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false))
    }

    const renderSubRow = ({row}: any) => {
        const expandedRowIndex = row?.index;
        const customerBrandMaterialId = row?.original?.material_details?.[customerBrandMaterialIdKey];
        const subRows = subRowData?.[customerBrandMaterialId];

        if (!subRows) {
            fetchSubRowData(customerBrandMaterialId, expandedRowIndex);
        }

        let subRowHeaders = materialSubRowHeaders;

        if (row?.original?.material_details?.material_type == FABRIC_MATERIAL) {
            subRowHeaders = fabricSubRowHeaders;
        }

        return (
            <>
            <Table
                size="small"
                sx={{
                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    '& .MuiTableCell-head': {
                        color: (theme) => theme.palette.grey[700],
                        background: (theme) => theme.palette.grey[50],
                    },
                }}
            >
                <TableHead>
                    <TableRow>
                        {subRowHeaders.map((header: any, headerIndex: any) => (
                            <TableCell key={headerIndex}>{header?.header}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                {subRows?.slice((pagination.tablePageNumber[expandedRowIndex]) * (pagination.tableRowsPerPage[expandedRowIndex] || 10),(pagination.tablePageNumber[expandedRowIndex] + 1) * (pagination.tableRowsPerPage[expandedRowIndex] || 10)).map((row: any, rowIndex: number) => (
                <TableRow
                    key={rowIndex}
                    sx={{
                        '&:last-child td, &:last-child th': {
                            border: 0,
                        },
                        marginTop: '10px',
                        marginBottom: '10px'
                    }}
                >
                    {subRowHeaders.map((header: any, headerIndex: any) => (
                        <TableCell key={headerIndex}>
                            <Typography>{header.accessorFn(row) || '--'}</Typography>
                        </TableCell>
                    ))}
                </TableRow>
                ))}
                {subRows?.length == 0 &&
                <TableRow>
                <TableCell colSpan={subRowHeaders.length}>
                    <Typography sx={{textAlign: 'center'}}>This item hasn't been GRN'd yet</Typography>
                </TableCell>
                </TableRow>}
            </TableBody>
                <TableFooter>
                    <TableRow>
                        <TablePagination
                            rowsPerPageOptions={[10, 50, 100]}
                            colSpan={subRowHeaders.length}
                            count={subRows?.length || 0}
                            rowsPerPage={pagination?.tableRowsPerPage[expandedRowIndex] || 10}
                            page={pagination?.tablePageNumber[expandedRowIndex] || 0}
                            onPageChange={(event: unknown, newPage: number) => handleChangePage(event, newPage, expandedRowIndex)}
                            onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => handleChangeRowsPerPage(event, expandedRowIndex)}
                            showFirstButton
                            showLastButton
                        />
                    </TableRow>
                </TableFooter>
            </Table>
            </>
        );
    };

    return (
        <>
            {isLoading ? <DefaultLoader/> : (
                <>
                    <RitzTable
                        columns={inHouseMaterialColumns}
                        data={grnData?.[dataKey]}
                        getRowCanExpand={getRowCanExpand}
                        renderSubComponent={renderSubRow}
                    />
                </>
            )}
        </>
    )
}
export default POClubGrnDetailView