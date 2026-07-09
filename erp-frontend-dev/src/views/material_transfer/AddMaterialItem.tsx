import { Box, Table, TableBody, TableCell, TableHead, TableRow, useTheme, Checkbox, Button, alpha, Link } from "@mui/material";
import React, { useEffect, useState } from "react";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import api from "@/services/api";
import { materialTransferForceEditMaterialItemListURL, materialTransferForceMaterialItemSaveURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import DefaultLoader from "@/components/DefaultLoader";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import SaveSpinner from "@/components/SaveSpinner";
import RitzInput from "@/components/Ritz/RitzInput";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import FormErrorMessage from "@/components/FormErrorMessage";

const AddMaterialItem = ({ transferId, clubId, customerBrandMaterialId, category, refreshData }: any) => {
  const theme = useTheme();
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [transferMaterials, setTransferMaterials] = useState<any>([]);
  const [selectedMaterialItems, setSelectedMaterialItems] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});
  const isAllChecked = selectedMaterialItems.length === transferMaterials?.length;

  const fetchData = () => {
    const requests = [
      api.get(materialTransferForceEditMaterialItemListURL(clubId, transferId, customerBrandMaterialId)),
    ];
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [transferMaterial] = respData;
      setTransferMaterials([...transferMaterial]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  };

  const handleAddMaterialItem = () => {
    setIsSaving(true);
    const selectedMaterialIds = selectedMaterialItems.map((materialItem: any) => ({
      id: materialItem?.id,
      transfer_quantity: materialItem?.transfer_quantity || 0,
    }));
    api.post(materialTransferForceMaterialItemSaveURL(transferId), selectedMaterialIds)
      .then((resp: any) => {
        toast.success(DEFAULT_SUCCESS);
        refreshData()
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        setErrors(error?.response?.data || {});
      })
      .finally(() => {
        setIsSaving(false);
      });
  };


  const handleCheckAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedMaterialItems(transferMaterials || []);
    } else {
      setSelectedMaterialItems([]);
    }
  };
  
  const handleMaterialSelection = (isChecked: boolean, materialItem: any) => {
    setSelectedMaterialItems((prev: any[]) => {
      if (isChecked) {
        return [...prev, materialItem];
      } else {
        return prev.filter((item: any) => item?.id !== materialItem?.id);
      }
    });
  };
  useEffect(() => {
    if (transferId) {
      fetchData();
    }
  }, [])

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <Box>
          <Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                      <Checkbox
                        checked={isAllChecked}
                        onChange={(e: any) => handleCheckAll(e.target.checked)}
                      />
                  </TableCell>
                  {category === 'fabric' && (
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>Roll No</TableCell>
                  )}
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>Barcode</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>Available Quantity</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>Transfer Quantity</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>Allocated PO</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>PO Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transferMaterials?.length === 0 && (
                  <TableRow sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}  >
                    <TableCell sx={{textAlign:'center'}} colSpan={6}>No data available .</TableCell>
                  </TableRow>
                )}
                {transferMaterials?.map((materialItem: any, materialIndex: any) => (
                  materialItem?.allocated_po_details?.map((poAllocation: any, allocationIndex: any) => (
                    <TableRow key={`${keyHelper.getNextKeyValue()}`} sx={{backgroundColor: (theme) => selectedMaterialItems.some((item: any) => item?.id === materialItem?.id) ? 'rgba(25, 118, 210, 0.08)' : alpha(theme.palette.grey[50], 0.4)}}>
                      {allocationIndex === 0 && (
                        <>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}  rowSpan={materialItem?.allocated_po_details?.length}>
                            <Checkbox
                              checked={selectedMaterialItems.some((item: any) => item?.id === materialItem?.id)}
                              onChange={(e: any) => handleMaterialSelection(e.target.checked, materialItem)}
                            />
                        </TableCell>
                          {category === 'fabric' && (
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}} rowSpan={materialItem?.allocated_po_details?.length}>{materialItem?.pack_number}</TableCell>
                          )}
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}} rowSpan={materialItem?.allocated_po_details?.length}>{materialItem?.barcode}</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}} rowSpan={materialItem?.allocated_po_details?.length}>{materialItem?.available_quantity?.quantity} {materialItem?.available_quantity?.quantity_units_display}</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}} rowSpan={materialItem?.allocated_po_details?.length}>
                            <RitzInput
                              isRequired
                              name="transfer_quantity"
                              id={`transfer_quantity`}
                              selectedValue={materialItem?.transfer_quantity}
                              handleOnChange={(event: any) => {
                                const updatedTransferMaterials = [...transferMaterials];
                                updatedTransferMaterials[materialIndex].transfer_quantity = parseFloat(event.target.value);
                                setTransferMaterials(updatedTransferMaterials);
                              }}
                              isReadOnly={!selectedMaterialItems.some((item: any) => item?.id === materialItem?.id)}
                              inputType='number'
                              size='small'
                            />
                            <FormErrorMessage message={errors?.inhouse_material_errors?.[materialItem?.id]?.transfer_quantity} />
                          </TableCell>
                        </>
                      )}

                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>
                        <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(poAllocation?.purchase_order_id)}>{poAllocation?.purchase_order_display_number}</Link>
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{poAllocation?.allocated_quantity?.quantity} {poAllocation?.allocated_quantity?.quantity_units_display}</TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button variant='contained' disabled={isSaving} onClick={() => {handleAddMaterialItem()}} >{isSaving && <SaveSpinner />}Add</Button>
          </Box>
        </Box>

      )}
    </>
  );
};

export default AddMaterialItem;