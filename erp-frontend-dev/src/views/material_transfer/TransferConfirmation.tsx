import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { materialTransferDetailsFromListPageURL, materialTransferDetailsPageURL } from "@/helpers/constants/front_end/CostingUrls";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Alert, Box, Button, Card, Checkbox, Divider, FormControl, FormControlLabel, IconButton, Link, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { materialTransferSaveURL, partialTransferMaterialListURL, poMaterialTransferListURL, transferPOListURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { plantWarehouseListURL } from "@/helpers/constants/rest_urls/GrnUrls";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import React from "react";
import RitzInput from "@/components/Ritz/RitzInput";
import NextLink from 'next/link';
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";

const TransferConfirmation = ({ clubId, transferStatus, transferData }: any) => {
    const router = useRouter();
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [approvedPlantList, setApprovedPlantList] = useState<any[]>([]);
    const [partialTransferMaterialList, setPartialTransferMaterialList] = useState<any[]>([]);
    const [selectedTransferType, setSelectedTransferType] = useState<any>({ transfer_type: null });
    const [errors, setErrors] = useState<any>({});
    const [poTransferMaterials, setPoTransferMaterials] = useState<any>({});
    const [transferPODetails, setTransferPODetails] = useState<any>([]);
    const [editRowData, setEditRowData] = useState<any>({});
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<any[]>([]);
    const [selectedPOIds, setSelectedPOIds] = useState<any[]>([]);

    const transferTypes = [{ id: 'full', type: 'PO Club Transfer' }, { id: 'po_transfer', type: 'PO Transfer' },{ id: 'partial', type: 'Partial PO Transfer' }, { id: 'within_costing_transfer', type: 'PO Material Transfer' }]

    const columns = (category: string): ColumnDef<any>[] => [
        {
            accessorKey: "supplier_id",
            header: '',
            cell: ({ row, getValue }) => (
                <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                            size="small"
                            onClick={() => handleRowExpand(row)}
                            style={{ cursor: "pointer" }}
                        >
                            {row.getIsExpanded() ? (
                                <KeyboardArrowDownIcon />
                            ) : (
                                <KeyboardArrowRightIcon />
                            )}
                        </IconButton>
                        <span style={{ paddingLeft: `${row.depth * 2}rem`, width: '20px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Checkbox
                                    size='small'
                                    checked={row.getIsSelected()}
                                    indeterminate={row.getIsSomeSelected()}
                                    onChange={row.getToggleSelectedHandler()}
                                />
                            </Box>
                        </span>
                    </Box>
                </span>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                align: "left",
                width: 95,
            },
        },
        {
            accessorKey: 'attributes.ritz_customer_brand_reference_code',
            header: 'Material',
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        {rowData?.attributes?.ritz_customer_brand_reference_code}
                    </Box>
                );
            },
        },
        {
            accessorKey: 'category',
            header: () => (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }}
                >
                    <Typography fontWeight="bold">Available Quantity</Typography>
                </Box>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }}>
                        {rowData?.total_available_quantity?.quantity} {rowData?.total_available_quantity?.quantity_units_display}
                    </Box>
                );
            },
        },
    ]
    const poColumns: ColumnDef<any>[] = [
        {
            accessorKey: "id",
            header: '',
            cell: ({ row, getValue }) => (
                <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <span style={{ paddingLeft: `${row.depth * 2}rem`, width: '20px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Checkbox
                                    size='small'
                                    checked={row.getIsSelected()}
                                    indeterminate={row.getIsSomeSelected()}
                                    onChange={row.getToggleSelectedHandler()}
                                />
                            </Box>
                        </span>
                    </Box>
                </span>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                align: "left",
                width: 95,
            },
        },
        {
          accessorKey: 'display_number',
          header: 'Purchase Order No',
          cell: props => (
            <Link component={NextLink} href={purchaseOrderDetailPageURL(props.row.original.id)}>{props.row.original.short_code}</Link>
          )
        },
        {
          accessorKey: 'customer_name',
          header: 'Customer',
        },
        {
          accessorKey: 'brand_name',
          header: 'Brand',
        },
      ]
    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const handleTransferTypeChange = (event: any, field: string) => {
        setSelectedTransferType({ ...selectedTransferType, [field]: event.target.value });
    };

    const getMetaData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(plantWarehouseListURL()),
        ]).then(([approvedPlants]) => {
            setApprovedPlantList(approvedPlants.data || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const getMaterialTransferList = () => {
        setIsTableLoading(true);
        api.get(partialTransferMaterialListURL(clubId)).then((response) => {
            setPartialTransferMaterialList(response.data || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
        });
    }

    const getPOMaterialTransferList = () => {
        setIsTableLoading(true);
        api.get(poMaterialTransferListURL(clubId)).then((response) => {
            setPoTransferMaterials(response.data || {});
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
        });
    }
    
    const getTransferPOList = () => {
        setIsTableLoading(true);
        api.get(transferPOListURL(clubId)).then((response) => {
            setTransferPODetails(response.data || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
        });
    }

    const handleProceed = () => {
        setErrors({})
        const dataList = {
            warehouse_id: selectedTransferType?.plant || null,
            transfer_type: selectedTransferType?.transfer_type,
            ...(selectedTransferType?.transfer_type === 'partial' && {
                po_packs: partialTransferMaterialList?.map((material: any) => ({
                    id: material?.id,
                    transfer_quantity: material?.transfer_quantity || 0,
                    quantity: material?.quantity || 0,
                    country_name: material?.country_name || '',
                    po_colorway: material?.po_colorway || '',
                    po_size: material?.po_size || ''
                })),
            }),
            ...(selectedTransferType?.transfer_type === 'within_costing_transfer' && {
                selected_materials: selectedMaterialIds.map((material: any) => ({
                    id: material.id,
                    transfer_quantity: material.transfer_quantity || 0
                })),
            }), 
            ...(selectedTransferType?.transfer_type === 'po_transfer' && {
                purchase_order_ids: selectedPOIds
            }),
        };
        api.post(materialTransferSaveURL(clubId), dataList).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            const respData = resp?.data || {};
            if (respData?.warehouse_material_transfer_id) {
                router.push(materialTransferDetailsPageURL(respData?.warehouse_material_transfer_id));
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors(error?.response?.data || {});
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleChangeTransferQuantity = (value: any, index: any, field: any) => {
        const updatedList = [...partialTransferMaterialList];
        updatedList[index] = { ...updatedList[index], [field]: value };
        setPartialTransferMaterialList(updatedList);
    }

    const onRowSelect = (selection: any) => {
        const selectedIndexes = Object.keys(selection).map((i: any) => +i);
    }
    const poRowSelect = (selection: any) => {
        const selectedIndexes = Object.keys(selection).map((i: any) => +i);
        const selectedData = selectedIndexes.map((i: number) => transferPODetails[i]);
        const transferPOIds = selectedData?.map((i: any) => i.id);
        setSelectedPOIds(transferPOIds)
    }

    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    };

    const isRollSelected = (rollId: number) =>selectedMaterialIds.some((item) => item.id === rollId);
      
    const getTransferQuantity = (rollId: number) =>selectedMaterialIds.find((item) => item.id === rollId)?.transfer_quantity ?? "";
      
    const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>, rollId: number) => {
        const newQty = parseFloat(event.target.value) || 0;
        setSelectedMaterialIds((prev) =>
          prev.map((item) =>
            item.id === rollId ? { ...item, transfer_quantity: newQty } : item
          )
        );
      };

    const renderSubRow = ({ row }: any) => {
        const mainData = row?.original;
        const subRows = row?.original.details || [];
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
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Checkbox
                                        disabled={!row.getIsSelected()}
                                        checked={subRows.every((r: any) => isRollSelected(r.id))}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            const rollObjects = subRows.map((r: any) => ({
                                                id: r.id,
                                                transfer_quantity: 0,
                                            }));
                                            setSelectedMaterialIds((prev) => {
                                                const existingIds = prev.map((item) => item.id);
                                                if (isChecked) {
                                                    const newOnes = rollObjects.filter((r: any) => !existingIds.includes(r.id));
                                                    return [...prev, ...newOnes];
                                                } else {
                                                    return prev.filter((item) => !rollObjects.some((r: any) => r.id === item.id));
                                                }
                                            });
                                        }}
                                        size="small"
                                    />
                                </Box>
                            </TableCell>
                            {mainData?.category === 'fabric' && (
                                <>
                                    <TableCell>Roll No</TableCell>
                                    <TableCell>Batch</TableCell>
                                </>
                            )}
                            <TableCell>Barcode</TableCell>
                            <TableCell>GRN Quantity</TableCell>
                            <TableCell>Transfer Quantity</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography fontWeight="bold">Transfer Quantity Unit</Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subRows.length > 0 ? (
                            subRows.map((roll: any, index: number) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        '&:last-child td, &:last-child th': {
                                            border: 0,
                                        },
                                        marginTop: '10px',
                                        marginBottom: '10px'
                                    }}
                                >
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Checkbox
                                                disabled={!row.getIsSelected()}
                                                size="small"
                                                checked={isRollSelected(roll.id)}
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    setSelectedMaterialIds((prev) => {
                                                        if (isChecked) {
                                                            return [...prev, { id: roll?.id, transfer_quantity: 0 }];
                                                        } else {
                                                            return prev.filter((item) => item?.id !== roll?.id);
                                                        }
                                                    });
                                                }}
                                            />
                                        </Box>
                                    </TableCell>
                                    {mainData?.category === 'fabric' && (
                                        <>
                                            <TableCell>{roll?.pack_number ?? "--"}</TableCell>
                                            <TableCell>{roll?.batch_number ?? "--"}</TableCell>
                                        </>
                                    )}
                                    <TableCell>{roll?.barcode ?? "--"}</TableCell>
                                    <TableCell>{roll?.grn_quantity?.quantity} {roll?.grn_quantity?.quantity_units_display}</TableCell>
                                    <TableCell>
                                        <RitzInput
                                            isRequired
                                            name="transfer_quantity"
                                            id={`transfer_quantity`}
                                            selectedValue={getTransferQuantity(roll?.id)}
                                            handleOnChange={(e: any) => handleQuantityChange(e, roll?.id)}
                                            inputType="number"
                                            size="small"
                                            isReadOnly={!isRollSelected(roll?.id)}
                                        />
                                        <FormErrorMessage message={errors?.quantity_errors?.[roll?.id]} />
                                    </TableCell>
                                    <TableCell>{roll?.grn_quantity?.quantity_units_display}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                                    <Box>There is nothing to show on material details.</Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </>
        );
    };

    useEffect(() => {
        if (clubId) {
            getMetaData();
        }
    }, [clubId])

    useEffect(() => {
        if (selectedTransferType?.transfer_type === 'partial') {
            getMaterialTransferList();
        }
        if (selectedTransferType?.transfer_type === 'within_costing_transfer') {
            getPOMaterialTransferList();
        }
        if (selectedTransferType?.transfer_type === 'po_transfer') {
            getTransferPOList();
        }
    }, [selectedTransferType?.transfer_type])

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Box>
                            {transferStatus && Array.isArray(transferData) && transferData.length > 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    Material Transfers have already been created for this PO Club. Please complete them before proceeding.
                                    <Box sx={{ mt: 1 }}>
                                        {transferData.map((transfer: any) => (
                                            <Box key={transfer.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                <FiberManualRecordIcon sx={{ fontSize: 8, color: 'primary.main', mr: 1 }} />
                                                <Link
                                                    href={materialTransferDetailsFromListPageURL(transfer.id)}
                                                    target="_blank"
                                                    underline="hover"
                                                >
                                                    {transfer.display_number}
                                                </Link>
                                            </Box>
                                        ))}
                                    </Box>
                                </Alert>
                            )}
                        </Box>
                        <Box>
                            <Typography variant='h6'>Transfer Type :</Typography>
                        </Box>
                        <Box>
                            <FormControl>
                                <RadioGroup
                                    row
                                    name="row-radio-buttons-group"
                                    value={selectedTransferType?.transfer_type}
                                    onChange={(e) => handleTransferTypeChange(e, 'transfer_type')}
                                >
                                    {transferTypes?.map((transferyType, transferyTypeIndex) => (
                                        <FormControlLabel
                                            key={transferyTypeIndex}
                                            value={transferyType.id}
                                            control={<Radio />}
                                            label={transferyType?.type}
                                        />
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant='h6'>Transfer Warehouse :</Typography>
                        </Box>
                        <Box>
                            <RitzSelection
                                id={'plant'}
                                name={'plant'}
                                optionValue={'id'}
                                optionText={'name'}
                                selectedValue={selectedTransferType?.plant}
                                isRequired={true}
                                options={approvedPlantList}
                                handleOnChange={(event: any) => handleTransferTypeChange(event, 'plant')}
                            />
                            <FormErrorMessage message={errors?.warehouse_id} />
                        </Box>
                    </Box>

                    {selectedTransferType?.transfer_type === 'partial' && (
                        <>
                            <Box>
                                <Divider sx={{ mt: 2 }} />
                            </Box>
                            <Box sx={{ mt: 1 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>PO</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Country</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Coloway</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Size</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Quantity</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', width: '25%' }}>Transfer Quantity</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {partialTransferMaterialList?.map((material: any, index: any) => (
                                            <TableRow >
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                     <Link sx={{cursor: 'pointer'}} href={purchaseOrderDetailPageURL(material.purchase_order_id)}>{material?.purchase_order_name}</Link>
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.country_name}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.po_colorway}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.po_size}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.quantity}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                    <TextField
                                                        id='transfer_quantity'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="transfer_quantity"
                                                        value={material?.transfer_quantity || 0}
                                                        onChange={(event: any) => { handleChangeTransferQuantity(parseFloat(event?.target?.value), index, 'transfer_quantity') }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    </TableBody>
                                </Table>
                            </Box>

                        </>
                    )}
                    {selectedTransferType?.transfer_type === 'within_costing_transfer' && (
                        <>
                            <Box>
                                <Divider sx={{ mt: 2 }} />
                            </Box>
                            {Object?.entries(poTransferMaterials).map(([category, materials]: [string, { material_data?: [] }]) => (
                                <React.Fragment key={category}>
                                    <Box sx={{ mb: 1, mt: 1 }}>
                                        <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                                            {category.replace("_", " ").toUpperCase()}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                        <RitzTable
                                            columns={columns(category)}
                                            data={materials?.material_data}
                                            getRowCanExpand={getRowCanExpand}
                                            renderSubComponent={renderSubRow}
                                            pagination={false}
                                            enableGlobalFilter={false}
                                            enableColumnFilter={false}
                                            onRowSelect={onRowSelect}
                                            rowSelect
                                            multiRowSelect={true}
                                            defaultExpanded={true}
                                            isLoading={isTableLoading}
                                        />
                                    </Box>
                                </React.Fragment>
                            ))}
                        </>
                    )}
                    {selectedTransferType?.transfer_type === 'po_transfer' && (
                        <>
                            <Box>
                                <Divider sx={{ mt: 2 }} />
                            </Box>
                            <Box sx={{ mb: 2 }}>
                                <RitzTable
                                    columns={poColumns}
                                    data={transferPODetails}
                                    pagination={false}
                                    enableGlobalFilter={false}
                                    enableColumnFilter={false}
                                    isLoading={isTableLoading}
                                    onRowSelect={poRowSelect}
                                    rowSelect
                                    multiRowSelect={true}
                                />
                            </Box>


                        </>
                    )}
                    {!transferStatus && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                            <Button variant="contained" onClick={() => { handleProceed() }}  >Save</Button>
                        </Box>
                    )}

                </>
            )}
        </>
    );
}


export default TransferConfirmation;