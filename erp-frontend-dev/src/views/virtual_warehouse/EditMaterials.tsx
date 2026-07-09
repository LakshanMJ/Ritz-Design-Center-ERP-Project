import api from "@/services/api";
import { Alert, Autocomplete, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as RestUrls from '@/helpers/constants/RestUrls';
import { getDefaultError } from "@/helpers/Utilities";
import React from "react";
import FabricTable from "./FabricTable";
import SewingTrimsTable from "./SewingTrimsTable";
import PackagingTrimsTable from "./PackagingTrimsTable";
import LeftOverEditTable from "./LeftOverEditTable";

const EditMaterials = ({editingMaterialCategory,selectedInHouseMaterialId, onSave}:any) => {
    interface SavingData {
        bulk_savings: any[];
        cutting_savings: any[];
        production_savings: any[];
        [key: string]: any; 
      }
    const [savingData, setSavingData] = useState<SavingData>({bulk_savings: [], cutting_savings: [], production_savings: [], excess_quantity: { quantity: 0 },sewing_quantity:{ quantity: 0 },available_quantity:{ quantity: 0 },state:'',material_category:'',barcode:''});
    const [barcodeData, setBarcodeData] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleQuantityChange = (field: 'excess_quantity' | 'available_quantity') => (event: any) => {
        const { value } = event.target;
    
        if (/^\d*$/.test(value)) {
            const updatedData = {
                ...savingData,
                [field]: {
                    ...savingData[field],
                    quantity: parseInt(value, 10) || 0,
                },
            };
            setSavingData(updatedData);
        }
    };

    const handleSavingChange = (savingsType: 'bulk_savings' | 'cutting_savings' | 'production_savings') => (event: any,index:any) => {
        const { value } = event.target;
        
        if (/^\d*$/.test(value)) {
            const updatedSavings = [...savingData[savingsType]];
        
            updatedSavings[index] = {
            ...updatedSavings[index],
            available_quantity: {
                ...updatedSavings[index].available_quantity,
                quantity: parseInt(value, 10) || 0,
            },
            };
        
            setSavingData(prevState => ({
            ...prevState,
            [savingsType]: updatedSavings,
            }));
        }
        };
  
    const handleInputChange = (event:any, newInputValue:any) => {
        setInputValue(newInputValue || '');
        setOpen(newInputValue.length > 0);
        const DataURL = RestUrls.barcodeListURL(newInputValue);
        api.get(DataURL).then((resp) => {
            const reseditdata = resp?.data || [];
             
        const convertData = reseditdata.map((data: any, dataIndex: any) => ({
            label: data.barcode,
            id: data.id
        }));
            setBarcodeData([...convertData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
        
    };

    const handleBarcodeSelect = (selectedOption: any) => {
        if (selectedOption) {
            const selectedId = selectedOption.id;
            fetchSearchData(selectedId)
        }
    };

    // Get default values for the detail inpt fields
    const fetchDefaultData = () => {
        const DataURL = RestUrls.orderSpecificMaterialsSavingDetailList(selectedInHouseMaterialId);
        api.get(DataURL).then((resp) => {
            const reseditdata = resp?.data || {};
            setSavingData({ ...reseditdata });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
    }

    // Get data for the searched barcode 
    const fetchSearchData = (selectedId:any) => {
        const DataURL = RestUrls.orderSpecificMaterialsSavingDetailList(selectedId);
        api.get(DataURL).then((resp) => {
            const reseditdata = resp?.data || {};
            setSavingData({ ...reseditdata });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
    }

    useEffect(() => {
        fetchDefaultData();
    }, []);

    const handleSave = (event:any) => {
            setIsSaving(true);
            
            const url = barcodeData[0].id  
                ? RestUrls.orderSpecificMaterialsSavingDetailList(barcodeData[0].id)
                : RestUrls.orderSpecificMaterialsSavingDetailList(selectedInHouseMaterialId);

            const request = {
                method: 'put',
                url: url,
                data: savingData
            };
    
            api(request).then(() => {
                setOpen(false);
            }).catch(error => {
                if (error?.response?.data) {    
                    setErrors(error.response.data);
                }
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsSaving(false));
            onSave();
    };

return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Autocomplete
            disablePortal
            options={barcodeData}
            value={savingData?.barcode}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={(event, newValue) => handleBarcodeSelect(newValue)}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Search Barcode" />}
        />

{  
    savingData?.state == 'order_specific_raw_material' ? (
        savingData?.material_category === 'fabric' ? (
            <FabricTable 
                savingData={savingData} 
                handleExcessQuantityChange={handleQuantityChange('excess_quantity')} 
                handleBulkSavingChange={handleSavingChange('bulk_savings')}
                handleCuttingSavingChange={handleSavingChange('cutting_savings')} 
                handleProductionSavingChange={handleSavingChange('production_savings')} 
            />
        ) : savingData?.material_camomotegory === 'sewing_trim' ? (
            <SewingTrimsTable 
                savingData={savingData}
                handleExcessQuantityChange={handleQuantityChange('excess_quantity')}
            />
        ) : savingData?.material_category === 'packaging_trim' ? (
            <>
            <PackagingTrimsTable 
                savingData={savingData} 
                handleAvailableQuantityChange={handleQuantityChange('available_quantity')} 
            />
            </>
        ) : (
            null
        )
    ) : (
        <LeftOverEditTable 
            savingData={savingData} 
            handleAvailableQuantityChange={handleQuantityChange('available_quantity')} 
        />
    )
}
    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
            <Button variant='contained' color='primary' onClick={handleSave}> 
                Save
            </Button>
    </Box>
</Box>
)} 

export default EditMaterials;
