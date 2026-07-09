import { Box, Button, Checkbox, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, useTheme } from "@mui/material";
import React, { useEffect, useState } from "react";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import api from "@/services/api";
import { otherMaterialTranferSaveURL, transferMaterialListURL, transferMaterialRollDetailsURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzInput from "@/components/Ritz/RitzInput";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SaveSpinner from "@/components/SaveSpinner";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzSearchableServerRender from "@/components/Ritz/RitzSearchableServerRender";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { plantWarehouseListURL } from "@/helpers/constants/rest_urls/GrnUrls";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import { materialTransferDetailsPageURL } from "@/helpers/constants/front_end/CostingUrls";
import { useRouter } from "next/router";

const OtherMaterialTransfer = ({ transferId }: any) => {
  const theme = useTheme();
  const router = useRouter();
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({ modalStatus: false, selectedIndex: null });
  const [errors, setErrors] = useState<any>({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [selectedData, setSelectedData] = useState<any>({material_details:[]})
  const [approvedPlantList, setApprovedPlantList] = useState<any[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<any[]>([]);

  const getMetaData = () => {
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

  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.subRows || [];
    return subRows.length > 0;
  };

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }

  const handleDeleteMaterialConfirmation = (status: any, index: any) => {
    setDeleteConfirmationModal({ modalStatus: status, selectedIndex: index });
  }

  const columns: ColumnDef<any>[] = [
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
      accessorKey: 'attributes.material_label',
      header: 'Material Type',
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {rowData?.attributes?.material_label}
          </Box>
        );
      },
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Ritz Reference Code',
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {rowData?.attributes?.ritz_customer_brand_reference_code}
            <RitzToolTip materialHeaders={[]} materialDetails={rowData?.attributes} />
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
            <IconButton
              size="small"
              onClick={() => { handleDeleteMaterialConfirmation(true, row.index) }}
              color="error"
            >
              <Tooltip title="Delete Material" arrow>
                <DeleteForeverIcon fontSize='inherit' />
              </Tooltip>
            </IconButton>
          </Box>
        );
      },
    },
  ]

  const onRowSelect = (selection: any) => {
    const selectedIndexes = Object.keys(selection).map((i: any) => +i);
  }
  const isRollSelected = (rollId: number) => selectedMaterialIds.some((item) => item.id === rollId);

  const getTransferQuantity = (rollId: number) => selectedMaterialIds.find((item) => item.id === rollId)?.transfer_quantity ?? "";

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
                <TableCell colSpan={7} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                  <Box>There is nothing to show on material details.</Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </>
    );
  };

  const handleAddNewRowToDetailsState = () => {
    setIsAddingMaterial(true)
    setIsTableLoading(true)
    api.get(transferMaterialRollDetailsURL(selectedData?.material)).then((response) => {
      const resp = response.data;
      setSelectedData((prevData: any) => ({
        ...prevData,
        material: null,
        material_details: [...(prevData.material_details || []), resp],
      }));
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsAddingMaterial(false);
      setIsTableLoading(false)
    });
  }

  const handleChangeMaterial = (value: any, field: any) => {
    setSelectedData({ ...selectedData, [field]: value });
  }

  const handleDeleteMaterial = () => {
    const updatedData = [...selectedData.material_details];
    if (deleteConfirmationModal?.selectedIndex >= 0) {
      updatedData.splice(deleteConfirmationModal.selectedIndex, 1);
    }
    setSelectedData((prev: any) => ({
      ...prev,
      material_details: updatedData
    }));
    handleDeleteMaterialConfirmation(false, null)
  };

  const handleSaveTrasfer = () => {
    setErrors({})
    const dataList = {
      warehouse_id: selectedData?.plant,
      selected_materials : selectedMaterialIds
    };
    api.post(otherMaterialTranferSaveURL(), dataList).then(resp => {
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

  useEffect(() => {
    getMetaData();
  }, [])

  return (
    <>
      {deleteConfirmationModal.modalStatus && (
        <RitzModal open={deleteConfirmationModal.modalStatus} title='Confirmation' onClose={() => { handleDeleteMaterialConfirmation(false, null) }} maxWidth='xs'>
          Are you sure you want to delete this ?
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant='contained' onClick={handleDeleteMaterial} disabled={isSaving}>
              {isSaving && <SaveSpinner />}Delete
            </Button>
          </Box>
        </RitzModal>
      )}
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <Box>
            <Box>
              <Typography variant='h6'>Transfer Warehouse :</Typography>
            </Box>
            <Box sx={{ width: '75%' }}>
              <RitzSelection
                id={'plant'}
                name={'plant'}
                optionValue={'id'}
                optionText={'name'}
                selectedValue={selectedData?.plant}
                isRequired={true}
                options={approvedPlantList}
                handleOnChange={(event: any) => handleChangeMaterial(event?.target?.value, 'plant')}
              />
              <FormErrorMessage message={errors?.warehouse_id} />
            </Box>
          <Box>
            <Typography variant='h6'>Material :</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: '75%' }}>
              <RitzSearchableServerRender
                id="costing"
                name="costing"
                optionValue="id"
                optionText="ritz_customer_brand_reference_code"
                selectedValue={selectedData.material}
                isRequired={true}
                handleOnChange={(value: any) => {handleChangeMaterial(value, 'material')}}
                optionUrl={(searchtext: string) => transferMaterialListURL(searchtext)}
              />
            </Box>
            <Box >
              <Button variant="contained" onClick={() => handleAddNewRowToDetailsState()} color="primary" fullWidth disabled={isAddingMaterial || !selectedData.material} >{isAddingMaterial && <SaveSpinner/>}Add Material </Button>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <RitzTable
              columns={columns}
              data={selectedData?.material_details}
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
           <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={() => handleSaveTrasfer()} color="primary"  disabled={isSaving} >{isSaving && <SaveSpinner/>}Save</Button>
          </Box>
        </Box>
      )}
    </>
  );
};

export default OtherMaterialTransfer;