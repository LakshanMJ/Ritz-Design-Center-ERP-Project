import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, useTheme } from "@mui/material";
import React, { useEffect, useState } from "react";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import EditIcon from '@mui/icons-material/Edit';
import api from "@/services/api";
import { materialTransferEditDetailsURL, materialTransferForceMaterialDeleteURL, materialTransferForceMaterialItemDeleteURL, materialTransferItemSaveURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DefaultLoader from "@/components/DefaultLoader";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RitzModal from "@/components/Ritz/RitzModal";
import AddMaterial from "./AddMaterial";
import AddMaterialItem from "./AddMaterialItem";
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import RitzInput from "@/components/Ritz/RitzInput";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SaveSpinner from "@/components/SaveSpinner";
import FormErrorMessage from "@/components/FormErrorMessage";

const EditTransferDetails = ({ transferId }: any) => {
  const theme = useTheme();
  const keyHelper = new ReactKeyHelper();
  const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });
  const [showAddNewMaterialModal, setShowAddNewMaterialModal] = useState({ modalStatus: null, materialCategoryId: null });
  const [showAddRollModal, setShowAddRollModal] = useState({ modalStatus: null, customerBrandMaterialId: null, materialCategory: null });
  const [transferDetails, setTransferDetails] = useState<any>({});
  const [editRowData, setEditRowData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({ type: null, modalStatus: false, selectedData: null });
  const [errors, setErrors] = useState<any>({});

  const fetchData = () => {
    setErrors({});
    const requests = [
      api.get(materialTransferEditDetailsURL(transferId)),
    ];
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [transferData] = respData;
      setTransferDetails({ ...transferData });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  };

  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.subRows || [];
    return subRows.length > 0;
  };

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }

  const handleAddMaterial = (status: any, category: any) => {
    setShowAddNewMaterialModal({ modalStatus: status, materialCategoryId: category })
  };

  const handleOpenRollAddModal = (status: any, cutomerBrandMaterialId: any, materialCategory: any) => {
    setShowAddRollModal({ modalStatus: status, customerBrandMaterialId: cutomerBrandMaterialId, materialCategory: materialCategory })
  }

  const handleDeleteMaterialConfirmation = (type: any, status: any, selectedData: any) => {
    setDeleteConfirmationModal({ type: type, modalStatus: status, selectedData: selectedData });
  }

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
            <OpenInNewIcon
              sx={{
                ml: 1,
                color: "rgb(25, 118, 210)",
                cursor: "pointer",
              }}
              onClick={() =>
                setShowMaterialDetailsModal({
                  modalStatus: true,
                  materialId: rowData?.attributes?.customer_brand_material_id,
                })
              }
            />
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
          <Typography fontWeight="bold">Transfer Quantity</Typography>
          <IconButton
            size="small"
            onClick={() => { handleAddMaterial(true, category) }}
            color="primary"
          >
            <Tooltip title="Add Material" arrow>
              <AddIcon fontSize="small" />
            </Tooltip>
          </IconButton>
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
            {rowData?.total_transfer_quantity?.quantity} {rowData?.total_transfer_quantity?.quantity_units_display}
            <IconButton
              size="small"
              onClick={() => { handleDeleteMaterialConfirmation('material', true, rowData) }}
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

  const handleEditRowDetails = (roll: any) => {
    setEditRowData(roll)
  }

  const handleSaveEditRowData = () => {
    setIsSaving(true);
    api.post(materialTransferItemSaveURL(transferId, editRowData?.id), editRowData)
      .then((resp: any) => {
        toast.success(DEFAULT_SUCCESS);
        fetchData()
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        setErrors({ ...error?.response?.data });
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const handleDeleteMaterial = () => {
    setIsSaving(true);
    api.delete(materialTransferForceMaterialDeleteURL(transferDetails?.po_club_id, transferId, deleteConfirmationModal?.selectedData?.attributes?.customer_brand_material_id))
      .then((resp: any) => {
        toast.success(DEFAULT_SUCCESS);
        handleDeleteMaterialConfirmation(null, false, null);
        fetchData();
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const handleDeleteMaterialItem = () => {
    setIsSaving(true);
    api.delete(materialTransferForceMaterialItemDeleteURL(deleteConfirmationModal?.selectedData?.id))
      .then((resp: any) => {
        toast.success(DEFAULT_SUCCESS);
        handleDeleteMaterialConfirmation(null, false, null);
        fetchData()
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const handleQuantityChange = (event: any) => {
    const value = parseFloat(event.target.value);
    setEditRowData({
      ...editRowData,
      transfer_quantity: {
        ...editRowData?.transfer_quantity,
        quantity: value,
      },
    });
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
                  <IconButton
                    size="small"
                    onClick={() => { handleOpenRollAddModal(true, mainData?.attributes?.customer_brand_material_id, mainData?.category) }}
                    color="primary"
                  >
                    <Tooltip title="Add New" arrow>
                      <AddIcon fontSize="small" />
                    </Tooltip>
                  </IconButton>
                </Box>
              </TableCell>
              <TableCell />
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
                  {mainData?.category === 'fabric' && (
                    <>
                      <TableCell>{roll?.pack_number ?? "--"}</TableCell>
                      <TableCell>{roll?.batch_number ?? "--"}</TableCell>
                    </>
                  )}
                  <TableCell>{roll?.barcode ?? "--"}</TableCell>
                  <TableCell>{roll?.grn_quantity?.quantity} {roll?.grn_quantity?.quantity_units_display}</TableCell>
                  <TableCell>
                    {editRowData?.id === roll?.id ? (
                      <>
                        <RitzInput
                          isRequired
                          name="transfer_quantity"
                          id={`transfer_quantity`}
                          selectedValue={editRowData?.transfer_quantity?.quantity}
                          handleOnChange={(event: any) => handleQuantityChange(event)}
                          inputType="number"
                          size="small"
                        />
                        <FormErrorMessage message={errors?.quantity_errors?.[editRowData?.id]?.transfer_quantity} />
                      </>

                    ) : (
                      roll?.transfer_quantity?.quantity
                    )}
                  </TableCell>
                  <TableCell>{roll?.transfer_quantity?.quantity_units_display}</TableCell>
                  <TableCell>
                    {editRowData?.id === roll?.id ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => { handleSaveEditRowData() }}
                          color="primary"
                        >
                          <Tooltip title="Save" arrow>
                            <SaveIcon fontSize='inherit' />
                          </Tooltip>
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => { setEditRowData({}) }}
                          color="error"
                        >
                          <Tooltip title="Close" arrow>
                            <CloseIcon fontSize='inherit' />
                          </Tooltip>
                        </IconButton>
                      </Box>

                    ) : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => { handleEditRowDetails(roll) }}
                          color="primary"
                        >
                          <Tooltip title="Edit" arrow>
                            <EditIcon fontSize='inherit' />
                          </Tooltip>
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => { handleDeleteMaterialConfirmation('material_item', true, roll) }}
                          color="error"
                        >
                          <Tooltip title="Delete Material Item" arrow>
                            <DeleteForeverIcon fontSize='inherit' />
                          </Tooltip>
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>

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
    if (transferId) {
      fetchData();
    }
  }, [])

  return (
    <>
      {showMaterialDetailsModal.modalStatus &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
          modalOpen={showMaterialDetailsModal?.modalStatus}
          setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
        />
      }
      {showAddNewMaterialModal.modalStatus &&
        <RitzModal
          onClose={() => handleAddMaterial(false, null)}
          title={"Add Material"}
          open={showAddNewMaterialModal.modalStatus}
          maxWidth='lg'
          fullWidth={true}
        >
          <AddMaterial transferId={transferDetails?.id} clubId={transferDetails?.po_club_id} category={showAddNewMaterialModal?.materialCategoryId} refreshData={() => { handleAddMaterial(false, null), fetchData() }} />
        </RitzModal>
      }
      {showAddRollModal.modalStatus &&
        <RitzModal
          onClose={() => handleOpenRollAddModal(false, null, null)}
          title={"Add Material Item"}
          open={showAddRollModal.modalStatus}
          maxWidth='lg'
          fullWidth={true}
        >
          <AddMaterialItem transferId={transferDetails?.id} clubId={transferDetails?.po_club_id} customerBrandMaterialId={showAddRollModal?.customerBrandMaterialId} category={showAddRollModal?.materialCategory} refreshData={() => { handleOpenRollAddModal(false, null, null), fetchData() }} />
        </RitzModal>
      }
      {deleteConfirmationModal.modalStatus && (
        <RitzModal open={deleteConfirmationModal.modalStatus} title='Confirmation' onClose={() => { handleDeleteMaterialConfirmation(null, false, null) }} maxWidth='xs'>
          Are you sure you want to delete this ?
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant='contained' onClick={deleteConfirmationModal?.type === 'material' ? handleDeleteMaterial : handleDeleteMaterialItem} disabled={isSaving}>
              {isSaving && <SaveSpinner />}Delete
            </Button>
          </Box>
        </RitzModal>
      )}

      {isLoading ? (
        <DefaultLoader />
      ) : (
        Object?.entries(transferDetails?.materials).map(([category, materials]: [string, { material_data?: [] }]) => (
          (!!materials?.material_data && materials.material_data.length > 0) && (
            <React.Fragment key={category}>
              <Box sx={{ mb: 1 }}>
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
                />
              </Box>
            </React.Fragment>
          )
        ))
      )}
    </>
  );
};

export default EditTransferDetails;