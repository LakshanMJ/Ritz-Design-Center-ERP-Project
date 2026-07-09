import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RitzSearchableServerRender from "@/components/Ritz/RitzSearchableServerRender";
import RitzInput from "@/components/Ritz/RitzInput";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import api from "@/services/api";
import {
  CustomerBrandMaterialListURL,
  PurcahseOrderAlloactionListURL,
  PurchaseOrderAllocationCreateURL,
  PurchaseOrderAllocationDeleteURL,
  PurchaseOrderAllocationUpdateURL,
  PurchaseOrderListURL,
} from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import { getConsumptionMeasuringUnitsURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTablePagination from "@/components/Ritz/RitzTablePagination";
import { getDefaultError } from "@/helpers/Utilities";
import InfoIcon from "@mui/icons-material/Info"; 

const POAllocation = ({ data, onClose, onSaveSuccess }: any) => {
  const [poAllocations, setPOAllocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editRowData, setEditRowData] = useState<any[]>([]);
  const [consumptionUnits, setConsumptionUnits] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteRowId, setDeleteRowId] = useState<number | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, any>>({});
  const [metaData, setMetaData] = useState<{ available_quantity: number; available_quantity_units: string } | null>(null);
  const [customerBrandMaterialOptions, setCustomerBrandMaterialOptions] = useState<any[]>([]);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      api.get(getConsumptionMeasuringUnitsURL()),
      api.get(
        PurcahseOrderAlloactionListURL(
          data.material_category,
          data.id,
          pageIndex + 1,
          pageSize
        )
      ),
    ])
      .then(([consumptionUnitsResponse, poAllocationsResponse]) => {
        setConsumptionUnits(consumptionUnitsResponse.data.all || []);
        setPOAllocations(poAllocationsResponse.data.results || []);
        setTotalCount(poAllocationsResponse.data.count || 0);
  
        // Extract and set meta_data
        setMetaData(poAllocationsResponse.data.meta_data || null);
      })
      .catch((error) => {
        console.error("Failed to fetch data", error);
        toast.error(getDefaultError(error?.response?.status) || "Failed to fetch data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleEdit = (rowId: number, data: any) => {
    const dataset = {
      ...data,
      index: rowId,
    };
    setEditRowData((prevState: any) => [...prevState, dataset]);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[rowId];
      return newErrors;
    });
  };

  const handleSave = (rowId: number) => {
    const editedRow = editRowData.find((row) => row.index === rowId);
    if (!editedRow) return;
  
    const isUpdate = poAllocations[rowId]?.id !== null;
    
    const allocationData: any = {
      id: poAllocations[rowId]?.id || null,
      in_house_material: data.id,
      purchase_order: editedRow.purchase_order || null,
      customer_brand_material: editedRow.customer_brand_material,
      allocated_quantity: parseFloat(editedRow.allocated_quantity),
      allocated_quantity_units: editedRow.allocated_quantity_units,
    };
  
    if (isUpdate) {
      allocationData.editable = editedRow.checkbox_value ?? true;
    }
  
    const request = {
      method: isUpdate ? "put" : "post",
      url: isUpdate
        ? PurchaseOrderAllocationUpdateURL(poAllocations[rowId]?.id)
        : PurchaseOrderAllocationCreateURL(),
      data: allocationData,
    };
    
    api(request)
      .then(() => {
        toast.success(
          isUpdate ? "Update successful" : "Creation successful"
        );
        fetchData();
        if (onSaveSuccess) {
          onSaveSuccess();
        }
        setEditRowData((prevState) =>
          prevState.filter((row) => row.index !== rowId)
        );
      })
      .catch((error) => {
        if (error.response?.data) {
          setErrors((prev) => ({
            ...prev,
            [rowId]: error.response.data,
          }));
        } else {
          toast.error(getDefaultError(error?.response?.status) || "Failed to save changes");
        }
        console.error("Save error", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCancel = (rowId?: number) => {
    if (rowId !== undefined) {
      const isNewRow = poAllocations[rowId]?.id === null; 
      setEditRowData((prevState: any) =>
        prevState.filter((row: any) => row?.index !== rowId)
      );
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[rowId];
        return newErrors;
      });
  
      if (isNewRow) {
        setPOAllocations((prevAllocations) =>
          prevAllocations.filter((_, index) => index !== rowId)
        );
      }
    } else {
      setEditRowData([]);
      setPOAllocations((prevAllocations) =>
        prevAllocations.filter((row) => row.id !== null)
      );
      setErrors({});
    }
  };

  const handleEditChange = (rowIndex: number, field: string, value: any) => {
    setEditRowData((prevData) => {
      const updatedData = [...prevData];
      const rowToUpdateIndex = updatedData.findIndex(
        (row) => row?.index === rowIndex
      );

      if (rowToUpdateIndex >= 0) {
        updatedData[rowToUpdateIndex] = {
          ...updatedData[rowToUpdateIndex],
          [field]: value,
        };
      }
      return updatedData;
    });

    if (errors[rowIndex]?.[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[rowIndex]) {
          delete newErrors[rowIndex][field];
          if (Object.keys(newErrors[rowIndex]).length === 0) {
            delete newErrors[rowIndex];
          }
        }
        return newErrors;
      });
    }
  };

  const handleCheckBoxChange = (rowIndex: number, checked: boolean) => {
    handleEditChange(rowIndex, "checkbox_value", checked);
  };

  const handleFocus = (rowId: number) => {
    setFocusedRow(rowId);
  };

  const handleAddRow = () => {
    const newRowIndex = poAllocations.length;
    const newRow = {
      id: null as any,
      purchase_order: "",
      customer_brand_material:"",
      purchase_order_number: "",
      allocated_quantity: "",
      allocated_quantity_units: "",
      allocated_quantity_units_display: "",
      checkbox_value: true,
    };

    setPOAllocations((prevRows) => [...prevRows, newRow]);
    setEditRowData((prevRows) => [
      ...prevRows,
      {
        ...newRow,
        index: newRowIndex,
      },
    ]);
    handleFocus(newRowIndex);
  };

  const handleDeleteClick = (rowId: number) => {
    setDeleteRowId(rowId);
    setIsDeleting(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleting(false);
    setDeleteRowId(null);
  };

  const handlePageNumberChange = (event: any, newPageIndex: number) => {
    setPageIndex(newPageIndex);
  };

  const handlePageSizeChange = (event: any) => {
    setPageIndex(0);
    setPageSize(parseInt(event.target.value, 10));
  };

  const confirmDelete = () => {
    if (deleteRowId === null) return;

    const rowId = deleteRowId;
    const row = poAllocations[rowId];

    setIsLoading(true);
    api
      .delete(PurchaseOrderAllocationDeleteURL(row.id))
      .then(() => {
        toast.success("Delete successful");
        fetchData();
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status) || "Failed to delete");
      })
      .finally(() => {
        setIsLoading(false);
        handleCloseDeleteModal();
      });
  };

  const isRowInEditMode = (selectedIndex: number) => {
    return editRowData.some((row) => row?.index === selectedIndex);
  };

  const getEditRowData = (index: number) => {
    return editRowData.find((row) => row?.index === index) || {};
  };

  const fetchCustomerBrandMaterialOptions = (id: any, value: any) => {
    return api.get(CustomerBrandMaterialListURL(id, "", value, ""));
  };

  const handlePOChange = (rowIndex: number, value: any) => {
    handleEditChange(rowIndex, "purchase_order", value);
    handleEditChange(rowIndex, "customer_brand_material", "");

    fetchCustomerBrandMaterialOptions(data.id, value)
      .then((response) => {
        setCustomerBrandMaterialOptions(response.data.results || []);
      })
      .catch((error) => {
        toast.error("Failed to fetch Customer Brand Material options");
      });
  };

  useEffect(() => {
    if (data) {
      fetchData();
    }
  }, [data, pageIndex, pageSize]);

  return (
    <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">
      Available Quantity: {metaData?.available_quantity} {metaData?.available_quantity_units}
      </Typography>
      <Button
        startIcon={<AddIcon />}
        variant="contained"
        color="primary"
        onClick={handleAddRow}
        sx={{ width: "150px", alignSelf: "flex-end" }}
      >
        Add
      </Button>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <TableContainer sx={{ border: "1px solid rgba(224, 224, 224, 1)", borderRadius: "4px" }}>
          <Table sx={{ borderCollapse: "collapse" }}>
            <TableHead>
              <TableRow>
                <TableCell>PO Number</TableCell>
                <TableCell>Customer Brand Material Code</TableCell>
                <TableCell>Allocated Quantity</TableCell>
                <TableCell>Units</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poAllocations.map((row, index) => {
                const isEditMode = isRowInEditMode(index);
                const editData = getEditRowData(index);
                const rowErrors = errors[index] || {};

                return (
                  <TableRow key={index}>
                  <TableCell>
                    {isEditMode ? (
                      <>
                        <RitzSearchableServerRender
                          name="purchase_order"
                          id="purchase_order"
                          selectedValue={editData?.purchase_order}
                          handleOnChange={(value: any) => {
                            handlePOChange(index, value);
                          }}
                          optionValue="purchase_order"
                          optionText="purchase_order_display_number"
                          optionUrl={(searchtext: string) =>
                            PurchaseOrderListURL(
                              data.material_category,
                              data.customer_brand_material,
                              searchtext,
                              searchtext ? "" : editData?.purchase_order || ""
                            )
                          }
                          error={!!rowErrors.purchase_order}
                        />
                        {rowErrors.purchase_order && (
                          <Typography color="error" variant="caption">
                            {rowErrors.purchase_order}
                          </Typography>
                        )}
                      </>
                    ) : (
                      row.purchase_order_number
                    )}
                  </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <>
                          <RitzSearchableServerRender
                            name="customer_brand_material"
                            id="customer_brand_material"
                            selectedValue={editData?.customer_brand_material}
                            handleOnChange={(value: any) =>
                              handleEditChange(index, "customer_brand_material", value)
                            }
                            optionValue="customer_brand_material"
                            optionText="customer_brand_material_code"
                            optionUrl={(searchtext: string) =>
                              CustomerBrandMaterialListURL(
                                data.id, 
                                searchtext,
                                editData?.purchase_order || "", 
                                searchtext ? "" : editData?.customer_brand_material || ""
                              )
                            }
                            initialOptions={customerBrandMaterialOptions} // Pass the updated state here
                            error={!!rowErrors.customer_brand_material}
                          />
                          {rowErrors.customer_brand_material && (
                            <Typography color="error" variant="caption">
                              {rowErrors.customer_brand_material}
                            </Typography>
                          )}
                        </>
                      ) : (
                        row.customer_brand_material_code
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <>
                          <RitzInput
                            inputType="number"
                            name="allocated_quantity"
                            id={`allocated_quantity_${index}`}
                            handleAutoFocus={focusedRow === index}
                            selectedValue={editData?.allocated_quantity}
                            handleOnChange={(e: any) =>
                              handleEditChange(index, "allocated_quantity", e.target.value)
                            }
                            handleOnFocus={() => handleFocus(index)}
                            customStyle={{ width: "100%", padding: "8px" }}
                            error={!!rowErrors.allocated_quantity}
                          />
                          {(rowErrors.allocated_quantity || rowErrors.allocation_quantity_exceeds) && (
                            <Typography color="error">
                              {rowErrors.allocated_quantity}
                              {rowErrors.allocated_quantity && rowErrors.allocation_quantity_exceeds && " "}
                              {rowErrors.allocation_quantity_exceeds}
                            </Typography>
                          )}
                        </>
                      ) : (
                        row.allocated_quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <>
                          <RitzSearchableSelection
                            options={consumptionUnits}
                            name="allocated_quantity_units"
                            id={`allocated_quantity_units_${index}`}
                            selectedValue={editData?.allocated_quantity_units}
                            handleOnChange={(value: string) =>
                              handleEditChange(index, "allocated_quantity_units", value)
                            }
                            optionValue="value"
                            optionText="display_value"
                            error={!!rowErrors.allocated_quantity_units}
                          />
                          {rowErrors.allocated_quantity_units && (
                            <Typography color="error" variant="caption">
                              {rowErrors.allocated_quantity_units}
                            </Typography>
                          )}
                        </>
                      ) : (
                        row.allocated_quantity_units_display
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {row.id !== null && (
                            <Tooltip title="Recalculate Available Quantity">
                              <Checkbox
                                checked={editData?.checkbox_value ?? true}
                                onChange={(e) => handleCheckBoxChange(index, e.target.checked)}
                              />
                            </Tooltip>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleSave(index)}
                            color="primary"
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleCancel(index)}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(index, row)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <RitzTablePagination
            count={totalCount}
            rowsPerPage={pageSize}
            page={pageIndex}
            onPageChange={handlePageNumberChange}
            onRowsPerPageChange={handlePageSizeChange}
          />
        </TableContainer>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end", marginTop: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Box>
      <RitzModal open={isDeleting} onClose={handleCloseDeleteModal} title="Confirm Delete">
        <Typography variant="body1">Are you sure you want to delete this?</Typography>
        <Box sx={{ marginTop: "1em", display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="contained" color="secondary" onClick={confirmDelete}>
            Yes, Delete
          </Button>
          <Button variant="outlined" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
        </Box>
      </RitzModal>
    </Box>
  );
};

export default POAllocation;