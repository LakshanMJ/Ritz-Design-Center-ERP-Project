import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { Alert, Box, Button, Checkbox, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from "@/components/Ritz/RitzModal";
import ActualSupplierData from "@/views/purchase_order/club/ActualSupplierData";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InfoIcon from '@mui/icons-material/Info';
import GeneralPOActualSupplierData from "@/views/general_purchase_order/GeneraPOActualSupplierData";
import CreateGeneralPurchaseOrder from "./CreateGeneralPurchaseOrder";

const GeneralPoBOM = ({ generalPoId, currentState, generalPOType, orderId, versionId }: any) => {
    const router = useRouter();
    const [materialBomData, setMaterialBomData] = useState([]);
    const [selectedMaterialBomData, setSelectedMaterialBomData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actualSupplierModal, setactualSupplierModal] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(0);
    const [selectedGeneralPOQuantityId, setSelectedGeneralPOQuantityId] = useState(0);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
    const [removedMaterialIds, setRemovedMaterialIds] = useState([]);
    const [openQuantityEditModal, setOpenQuantityEditModal] = useState({modalStatus:false, materialId: null, generalPOQuantityId: null});
  
    const handleRemoveCheckboxChange = (rowData: any) => {
        const id = rowData.id;
        if (removedMaterialIds.includes(id)) {
            setRemovedMaterialIds(prevIds => prevIds.filter(item => item !== id));
        } else {
            setRemovedMaterialIds(prevIds => [...prevIds, id]);
        }
    };

    const handleRemoveCheckAllChange = (event: any) => {
        if (event.target.checked) {
            const allIds = selectedMaterialBomData.map(item => item.id);
            setRemovedMaterialIds(allIds);
        } else {
            setRemovedMaterialIds([]);
        }
    };


    const handleCheckboxChange = (rowData: any) => {
        const id = rowData.id;
        if (selectedMaterialIds.includes(id)) {
            setSelectedMaterialIds(prevIds => prevIds.filter(item => item !== id));
        } else {
            setSelectedMaterialIds(prevIds => [...prevIds, id]);
        }
    };
    const handleCheckAllChange = (event: any) => {
        if (event.target.checked) {
            const allIds = materialBomData.map(item => item.id);
            setSelectedMaterialIds(allIds);
        } else {
            setSelectedMaterialIds([]);
        }
    };
    const handleSelectCheckedMaterials = () => {
        const dataToSend = {
            material_quantity_ids: selectedMaterialIds.map(id => ({
                id: id,
                send_po_for_material: true
            }))
        };

        api.post(poRestUrls.generalPOMaterialQuantityStatusChangeURL(), dataToSend).then(resp => {
            const selectedItems = materialBomData.filter(item => selectedMaterialIds.includes(item.id));
            setSelectedMaterialBomData(prevSelected => [...prevSelected, ...selectedItems]);
            setMaterialBomData(prevData => prevData.filter(item => !selectedMaterialIds.includes(item.id)));
            setSelectedMaterialIds([]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
    };
    const handleRemoveCheckedMaterials = () => {
        const dataToSend = {
            material_quantity_ids: removedMaterialIds.map(id => ({
                id: id,
                send_po_for_material: false
            }))
        };
        
        api.post(poRestUrls.generalPOMaterialQuantityStatusChangeURL(), dataToSend).then(resp => {
            const selectedItems = selectedMaterialBomData.filter(item => removedMaterialIds.includes(item.id));
            setMaterialBomData(prevSelected => [...prevSelected, ...selectedItems]);
            setSelectedMaterialBomData(prevData => prevData.filter(item => !removedMaterialIds.includes(item.id)));
            setRemovedMaterialIds([]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
      
    };
    const tableColsBomData: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: () => (
                <Checkbox
                    sx={{ p: 0 }}
                    checked={
                        (selectedMaterialIds.length === materialBomData.length && selectedMaterialIds.length !== 0) || false
                    }
                    indeterminate={selectedMaterialIds.length > 0 && selectedMaterialIds.length < materialBomData.length}
                    onChange={handleCheckAllChange}
                />
            ),
            cell: (props) => {
                const rowData = props.row.original
                return <Checkbox sx={{ p: 0 }} checked={selectedMaterialIds.includes(rowData.id)} onChange={() => handleCheckboxChange(rowData)} />
            },
            enableSorting: false,
            enableColumnFilter: false

        },
        {
            header: 'Delivery Date Status',
            cell: (props) => {
                const deliveryDate = props.row.original.completed
                if (deliveryDate === true) {
                    return <CheckIcon sx={{ color: 'green' }} />
                } else {
                    return <CloseIcon sx={{ color: 'red' }} />
                }

            },
        },
        {
            accessorKey: 'material_details.attributes.material_label',
            header: 'Material'
        },
        {
            accessorKey: 'material_details.attributes.material_label',
            header: 'Ritz Reference Code',
            cell: ({ row }: any) => {
                const materialHeaders = row?.original?.material_details?.headers;
                const materialDetails = row?.original?.material_details?.attributes;
                return (
                    <>
                  <Box sx={{display: 'flex', flexDirection: 'row'}}>
                  <Typography sx={{mr: 1}}>{row?.original?.material_details?.attributes?.ritz_customer_brand_reference_code}</Typography>
                    <Tooltip arrow title={
                         <Box>
                               {materialHeaders.map((header: any, headerIndex: number) => (
                                   <Typography key={headerIndex}>{header.label} : {materialDetails[header.name]}</Typography>
                               ))}
                              </Box>
                    }>
                        <InfoIcon fontSize="small" sx={{opacity: '60%'}}/>
                    </Tooltip>
                  </Box>
                    </>
                );
            }
        },
        {
            accessorKey: 'material_details.attributes.reference_code',
            header: 'Customer Reference Code'
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier'
        },
        {
            accessorKey: 'order_quantity',
            header: 'Quantity',
            cell: (props) => {
                const quantity = props.row.original.order_quantity;
                const quantityUnit = props.row.original.order_quantity_units_display;
                return `${quantity} ${quantityUnit}`;
                

            },
        },
    ];
    const tableColsSelectedMaterial: ColumnDef<any>[] = [
        ...(currentState === 'quantity_verification' && !generalPOType ? [
            {
                accessorKey: 'id',
                header: () => (
                    <Checkbox
                        sx={{ p: 0 }}
                        checked={
                            (removedMaterialIds.length === selectedMaterialBomData.length && removedMaterialIds.length !== 0) ||
                            false
                        }
                        indeterminate={removedMaterialIds.length > 0 && removedMaterialIds.length < selectedMaterialBomData.length}
                        onChange={handleRemoveCheckAllChange}
                    />
                ),
                cell: (props: { row: { original: any; }; }) => {
                    const rowData = props.row.original
                    return <Checkbox sx={{ p: 0 }} checked={removedMaterialIds.includes(rowData.id)} onChange={() => handleRemoveCheckboxChange(rowData)} />
                },
                enableSorting: false,
                enableColumnFilter: false
            }
        ] : []),
        {
            header: 'Delivery Date Status',
            cell: (props) => {
                const deliveryDate = props.row.original?.completed
                if (deliveryDate === true) {
                    return <CheckIcon sx={{ color: 'green' }} />
                } else {
                    return <CloseIcon sx={{ color: 'red' }} />
                }

            },
        },
        {
            accessorKey: 'material_details.attributes.material_label',
            header: 'Material'
        },
        {
            accessorKey: 'material_details.attributes.material_label',
            header: 'Ritz Reference Code',
            cell: ({ row }: any) => {
                const materialHeaders = row?.original?.material_details?.headers;
                const materialDetails = row?.original?.material_details?.attributes;
                return (
                    <>
                  <Box sx={{display: 'flex', flexDirection: 'row'}}>
                  <Typography sx={{mr: 1}}>{row?.original?.material_details?.attributes?.ritz_customer_brand_reference_code}</Typography>
                    <Tooltip arrow title={
                         <Box>
                               {materialHeaders.map((header: any, headerIndex: number) => (
                                   <Typography key={headerIndex}>{header.label} : {materialDetails[header.name]}</Typography>
                               ))}
                              </Box>
                    }>
                        <InfoIcon fontSize="small" sx={{opacity: '60%'}}/>
                    </Tooltip>
                  </Box>
                    </>
                );
            }
        },
        {
            accessorKey: 'material_details.attributes.reference_code',
            header: 'Customer Reference Code'
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier'
        },
        {
            accessorKey: 'order_quantity',
            header: 'Quantity',
            cell: (props) => {
                const quantity = props.row.original.order_quantity;
                const quantityUnit = props.row.original.order_quantity_units_display;
                return `${quantity} ${quantityUnit}`;
                

            },
        },
        {
            accessorKey: "id",
            header: 'Action',
            cell: (props) => {
                const { id, material, quantity } = props.row.original;
                console.log(material,"material")
                return (
                    <>
                        <IconButton size='small' color='primary' onClick={() => { handleOpenSupplierModal(id, material) }}>
                            <EditIcon fontSize='inherit' />
                        </IconButton>
                    </>
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        },


    ];
    // {currentState == 'quantity_verified' && (
    //     <Button variant="outlined" color="primary" sx={{ mt: 1 }} onClick={handleRemoveCheckedMaterials}  > <ArrowDownwardIcon />Remove Checked Materials</Button>
    // )}

    const fetchPurchaseOrderPacks = () => {
        const requests = [
            api.get(poRestUrls.generalPOBOMMaterialDetailsURL(generalPoId)),
        ];
        Promise.all(requests).then(response => {
            const respData = response.map(r => r.data);
            const [bomData] = respData;
            const selectedMaterialBomData = bomData.filter((item: { send_po_for_material: boolean; }) => item.send_po_for_material === true);
            const materialBomData = bomData.filter((item: { send_po_for_material: boolean; }) => item.send_po_for_material !== true);
            setMaterialBomData([...materialBomData]);
            setSelectedMaterialBomData([...selectedMaterialBomData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleOpenSupplierModal = (id: any, materialId: any) => {
        setSelectedMaterialId(materialId)
        setSelectedGeneralPOQuantityId(id)
        setactualSupplierModal(true)

    }
    const handleCloseActualSupplierModal = () => {
        setactualSupplierModal(false)
    }
    const handleSavedActualSupplierModalDetails = (status: any, exitingRowData: any) => {
        if (status) {
            setactualSupplierModal(false)
        }
        if (exitingRowData?.general_po_material_quantity_id) {
            setSelectedMaterialBomData(prevData =>
                prevData.map(material =>
                    material.id === exitingRowData?.general_po_material_quantity_id ?
                        { ...material, completed: exitingRowData.completed, order_quantity: exitingRowData.quantity, order_quantity_units_display: exitingRowData.quantity_units_display } : material
                )
            );

        }
        setSelectedMaterialIds([])
        setRemovedMaterialIds([])
    }

    const handleOpenGeneralPOQuantityModal = (status: any, material: any, generalPOQuantityId: any) =>{
        if(status){
            setactualSupplierModal(false)
            setOpenQuantityEditModal({ modalStatus: true, materialId: material, generalPOQuantityId: generalPOQuantityId })
        }
    }

    const handleLoadExitingMaterial = (materialData: any) => {
        setOpenQuantityEditModal({modalStatus: false, materialId: null, generalPOQuantityId: null})
        setSelectedMaterialId(materialData.materialId)
        setSelectedGeneralPOQuantityId(materialData.generalPOQuantityId)
        setactualSupplierModal(true)
    }

    const handleCloseCreateQuantityModal = () => {
        setOpenQuantityEditModal({ modalStatus: false, materialId: null, generalPOQuantityId: null })
        fetchPurchaseOrderPacks()
    }

    useEffect(() => {
        if (generalPoId) {
            fetchPurchaseOrderPacks();
        }
    }, [generalPoId]);

    return (
        <>
            {actualSupplierModal && (
                <RitzModal open={actualSupplierModal} onClose={handleCloseActualSupplierModal} title='Edit Supplier Changes' maxWidth={'lg'} >
                    {generalPOType ? (
                        <ActualSupplierData materialId={selectedMaterialId} generalPoId={selectedGeneralPOQuantityId} savedDetails={handleSavedActualSupplierModalDetails} supplierBOMMaterialIds={selectedMaterialBomData} generalPOType={generalPOType} openEditGeneralPOQuantityModal={handleOpenGeneralPOQuantityModal} />
                    ) : (
                        <GeneralPOActualSupplierData materialId={selectedMaterialId} generalPoId={selectedGeneralPOQuantityId} savedDetails={handleSavedActualSupplierModalDetails} supplierBOMMaterialIds={selectedMaterialBomData} openEditGeneralPOQuantityModal={handleOpenGeneralPOQuantityModal} currentState={currentState} />
                    )}
                </RitzModal>
            )}
            {openQuantityEditModal.modalStatus && (
                <RitzModal open={openQuantityEditModal.modalStatus} onClose={() => setOpenQuantityEditModal({modalStatus: false, materialId: null, generalPOQuantityId: null})} title={"Edit General Purchase Order"} maxWidth='lg' >
                    <CreateGeneralPurchaseOrder orderId={orderId} versionId={versionId} generalPOId={generalPoId} loadExitingMaterial={handleLoadExitingMaterial} modalType={'discrepancy_reasons'} exitingMaterialData={openQuantityEditModal} closeModal={() => {handleCloseCreateQuantityModal()}} />
                </RitzModal>
            )}

            {isLoading ? <DefaultLoader /> :
                <>
                    {(currentState == 'quantity_verification' && !generalPOType) && (
                        <Box sx={{ width: "50%" }}>
                            <Alert severity='info' sx={{ mb: 2 }}>
                                Please select the necessary materials from the BOM details below
                            </Alert>
                        </Box>
                    )}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }} color={'primary'}>Selected BOM Material Details :</Typography>
                        </Box>
                        {(currentState == 'quantity_verification' && !generalPOType) && (
                            <Button variant="outlined" color="primary" sx={{ mt: 1 }} onClick={handleRemoveCheckedMaterials}  > <ArrowDownwardIcon />Remove Checked Materials</Button>
                        )}

                        <RitzTable columns={tableColsSelectedMaterial} data={selectedMaterialBomData} />
                    </Box>
                    {(currentState == 'quantity_verification' && !generalPOType) && (
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography style={{ fontWeight: 'bold', fontSize: '1rem' }} color={'primary'}>BOM Details :</Typography>
                            </Box>
                            <Button variant="outlined" color="primary" sx={{ mt: 1 }} onClick={handleSelectCheckedMaterials} > <ArrowUpwardIcon />Select Checked Materials</Button>
                            <RitzTable columns={tableColsBomData} data={materialBomData} />
                        </Box>
                    )}
                    
                </>
            }

        </>
    )
}

export default GeneralPoBOM;
