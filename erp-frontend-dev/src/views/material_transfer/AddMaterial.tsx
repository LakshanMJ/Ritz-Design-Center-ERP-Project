import { Box, Checkbox, Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { materialTransferForceEditMaterialListURL, materialTransferForceMaterialSaveURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import DefaultLoader from "@/components/DefaultLoader";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import SaveSpinner from "@/components/SaveSpinner";
import RitzInput from "@/components/Ritz/RitzInput";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";

const AddMaterial = ({ transferId, clubId, category, refreshData }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [transferMaterials, setTransferMaterials] = useState<any>([]);
  const [focusCellId, setFocusCellId] = useState(null);
  const [selectedMaterials, setSelectedMaterials] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});

  const fetchData = () => {
    const requests = [
      api.get(materialTransferForceEditMaterialListURL(clubId, transferId, category)),
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

  const handleAddMaterial = () => {
    setIsSaving(true);
    const selectedMaterialIds = selectedMaterials.map((material: any) => ({
      customer_brand_material_id: material?.attributes?.customer_brand_material_id,
      transfer_quantity: material?.transfer_quantity || 0,
    }));
    api.post(materialTransferForceMaterialSaveURL(clubId, transferId), selectedMaterialIds)
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

  const handleOnFocusCell = (cellId: any) => {
    setFocusCellId(cellId);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'display_number',
      header: ({ table }) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            size='small'
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </Box>
      ),
      cell: ({ row, getValue }) => (
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
      ),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      meta: {
        align: 'left',
        width: 95
      }

    },
    {
      accessorKey: 'attributes.material_label',
      header: 'Material Type',
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Ritz Code',
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {rowData?.attributes?.ritz_customer_brand_reference_code}
            <RitzToolTip materialHeaders={rowData?.headers} materialDetails={rowData?.attributes} />
          </Box>
        );
      },
    },
    {
      accessorKey: 'total_available_quantity.quantity',
      header: 'Available Quantity',
      cell: ({ row }) => {
        return (
          <Box >
            {row.original?.total_available_quantity?.quantity} {row.original?.total_available_quantity?.quantity_units_display} 
          </Box>
        );
      }
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Transfer Quantity',
      cell: ({ row }) => {
        return (
          <Box >
            <RitzInput
              isRequired
              name="transfer_quantity"
              id={`transfer_quantity_${row.index}`}
              selectedValue={row.original?.transfer_quantity}
              handleOnChange={(event: any) =>{
                const updatedTransferMaterials = [...transferMaterials];
                updatedTransferMaterials[row.index].transfer_quantity = parseFloat(event.target.value);
                setTransferMaterials(updatedTransferMaterials);
              }}
              isReadOnly={!row.getIsSelected()}
              inputType='number'
              handleOnFocus={() => handleOnFocusCell(`transfer_quantity_${row.index}`)}
              handleAutoFocus={focusCellId === `transfer_quantity_${row.index}`}
              size='small'
            />
            <FormErrorMessage message={errors?.material_errors?.[row.original?.attributes?.customer_brand_material_id]?.transfer_quantity} />
          </Box>
        );
      },
    },
  ]
  const onRowSelect = (selection: any) => {
    const selectedIndexes = Object.keys(selection).map((i: any) => +i);
    const selectedData = selectedIndexes.map((i: number) => transferMaterials[i]);
    setSelectedMaterials(selectedData);
  }

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
            <RitzTable
              columns={columns}
              data={transferMaterials}
              rowSelect
              multiRowSelect
              onRowSelect={onRowSelect}
              pagination={false}
              enableGlobalFilter={false}
              enableColumnFilter={false}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button variant='contained' disabled={isSaving} onClick={() => {handleAddMaterial()}} >
              {isSaving && <SaveSpinner />}Add
            </Button>
          </Box>
        </Box>

      )}
    </>
  );
};

export default AddMaterial;