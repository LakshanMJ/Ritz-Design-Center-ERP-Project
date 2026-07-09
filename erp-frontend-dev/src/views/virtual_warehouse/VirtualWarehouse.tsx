import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { Alert, Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material"
import React, { useEffect, useState } from "react";
import { getDefaultError, hasRole } from "@/helpers/Utilities";
import api from "@/services/api";
import toast from "react-hot-toast";
import * as RestUrls from '../../helpers/constants/RestUrls';
import * as VirtualWarehouseUrls from '../../helpers/constants/rest_urls/VirtualWarehouseUrls';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlantWisePODetails from "./PlantWisePODetails";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import EditIcon from '@mui/icons-material/Edit';
import EditMaterials from "./EditMaterials";
import { STORE_ADMIN } from "@/helpers/constants/RoleManager";

const VirtualWarehouse = ({inhouse_material_id}:any) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const [state, setState] = useState({
    showOrderSpecificTable: false,
    showClubSelectingButtons: false,
    showCustomerSelection: false,
    showSelectedPOClub: false,
    showTable: true,
    isEditMaterialsModalOpen: false,
    isPOClubSelected: false,
    isPOClubModalOpen: false
  });

  const [selection, setSelection] = useState({
    plantSelected: null,
    selectedCustomer: { id: null, name: '' },
    selectedOrderSpecificType: '',
    clickedClubOptionButtonId: null,
    selectedPoClub: {po_display: '',club_id: null},
    selectedMaterialType: '',
    selectedInHouseMaterialId: null,
    editingMaterialCategory: null
  });
  
  const [data, setData] = useState({
    plantData: [],
    pathData: null,
    clubSupplierMaterialData:[],
    plantWiseCustomerData:[]
  });
  
  const canEdit = hasRole(STORE_ADMIN);
  const plant = data.plantWiseCustomerData.find(plant => plant.id == selection.plantSelected);
  const materialCategories = ["fabric", "sewingTrims", "packagingTrims"];

  const [allSupplierMaterialData, setAllSupplierMaterialData] = useState({
    fabric: [],
    sewingTrims: [],
    packagingTrims: []
  });

  const [searchedText, setSearchedText] = useState({
    fabric: '',
    sewingTrims: '',
    packagingTrims: '',
  });

  const [currentPage, setCurrentPage] = useState({
    fabric: '',
    sewingTrims: '',
    packagingTrims: '',
  });

  const [rowsPerPage, setRowsPerPage] = useState({
    fabric: 50,
    sewingTrims: 50,
    packagingTrims: 50,
  });

  const [selectedPageType, setSelectedPageType] = useState({
    fabric: '',
    sewingTrims: '',
    packagingTrims: '',
  });

  const handleShowAllClubMaterials = (event:any,plant_id:any,customer_id:any,customer_name:any,club_display_number:any,club_id:any,type:any) => {
    const customer = { id: customer_id, name: customer_name };
    handlePlantSelection(event,plant_id)
    handleCustomerSelect(customer)
    const selectedId = 2
    setSelection(prevSelection => ({
      ...prevSelection,
      clickedClubOptionButtonId: selectedId,
    }));
    setState(prevState => ({
      ...prevState,
      showSelectedPOClub: true,
    }));
    setState(prevState => ({
      ...prevState,
      showOrderSpecificTable: false,
    }));

    const poClubData= {id: club_id, po_display: club_display_number};
    const handlePoClubSelectNew = (data:any) => {
      setSelection(prevSelection => ({
        ...prevSelection,
        selectedPoClub: {po_display: data.po_display,club_id: data.id},
      }));
    };
    handlePoClubSelectNew(poClubData)
    setSelection(prevSelection => ({
      ...prevSelection,
      selectedOrderSpecificType: type,
    }));
    fetchData(club_id,type)
  }

  const handleEditMaterialDetails = (in_house_material_id:any,category:any) => {
    setSelection(prevSelection => ({
      ...prevSelection,
      selectedInHouseMaterialId: in_house_material_id,
    }));
    setSelection(prevSelection => ({
      ...prevSelection,
      editingMaterialCategory: category,
    }));
    setState(prevSelection => ({
      ...prevSelection,
      isEditMaterialsModalOpen: true,
    }));
  }
    
  //  Raw materials - All plants All customers table columns
  const rawMaterialsFabricColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'supplier_name',
      header: 'Supplier',
    },
    {
      accessorKey: 'colorway_category',
      header: 'Colorway Type',
      enableSorting: false
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: props => {
        const material = props.row.original.attributes.ritz_customer_brand_reference_code
        const materialDets = props.row.original.attributes
        const materialHeaders = props.row.original.headers
        return (
          <>
          {material}
          <RitzToolTip materialHeaders={materialHeaders} materialDetails={materialDets}/>
          </>
      );
      },
      enableSorting: false
    },
    {
      accessorKey: 'color',
      header: 'Color',
      enableSorting: false
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '90px', height: '90px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: 'excess',
      header: 'Excess Quantity',
      enableSorting: false,
      cell: props => {
        const excess = props.row.original.excess
        return `${excess.quantity} ${excess.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'bulk_saving',
      header: 'Bulk (Saving)',
      enableSorting: false,
      cell: props => {
        const bulk_saving = props.row.original.bulk_saving
        return `${bulk_saving.quantity} ${bulk_saving.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'cutting_saving',
      header: 'Cutting (Saving)',
      enableSorting: false,
      cell: props => {
        const cutting_saving = props.row.original.cutting_saving
        return `${cutting_saving.quantity} ${cutting_saving.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'production_saving',
      header: 'Production (Saving)',
      enableSorting: false,
      cell: props => {
        const production_saving = props.row.original.production_saving
        return `${production_saving.quantity} ${production_saving.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'total_quantity',
      header: 'Total Quantity',
      enableSorting: false,
      cell: props => {
        const total_quantity = props.row.original.total_quantity
        return `${total_quantity.quantity} ${total_quantity.quantity_units_display}`;
    },
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id

        return (
          <>
          <Tooltip title="Show All Club Materials">
            <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
            <EditIcon
              sx={{
                cursor: canEdit ? 'pointer' : 'default',
                color: canEdit ? 'inherit' : 'gray',
              }}
              onClick={() => {
                if (canEdit) {
                  handleEditMaterialDetails(in_house_material_id,'fabric');
                }
              }}>
            </EditIcon>
          </Tooltip>
          </>
        )
    },
    enableSorting: false
    }
  ]

  const rawMaterialsSewingTrimColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'supplier_name',
      header: 'Supplier',
    },
    {
      accessorKey: 'item',
      header: 'Item',
      enableSorting: false
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: props => {
        const material = props.row.original.attributes.ritz_customer_brand_reference_code
        const materialDets = props.row.original.attributes
        const materialHeaders = props.row.original.headers
        return (
          <>
          {material}
          <RitzToolTip materialHeaders={materialHeaders} materialDetails={materialDets}/>
          </>
      );
      },
      enableSorting: false
    },
    {
      accessorKey: 'attributes.button_color',
      header: 'Color',
      enableSorting: false
    },
    {
      accessorKey: '',
      header: 'Shape',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '90px', height: '90px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: 'excess',
      header: 'Excess Quantity',
      enableSorting: false,
      cell: props => {
        const excess = props.row.original.excess
        return `${excess.quantity} ${excess.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'sewing_quantity',
      header: 'Sewing Quantity',
      enableSorting: false,
      cell: props => {
        const sewing_quantity = props.row.original.sewing_quantity
        return `${sewing_quantity.quantity} ${sewing_quantity.quantity_units_display}`;
    },
    },
    {
      accessorKey: 'total_quantity',
      header: 'Total Quantity',
      enableSorting: false,
      cell: props => {
        const total_quantity = props.row.original.total_quantity
        return `${total_quantity.quantity} ${total_quantity.quantity_units_display}`;
    },
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id

        return (
          <>
          <Tooltip title="Show All Club Materials">
          <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
          <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(in_house_material_id,'sewingTrims')}></EditIcon>
          </Tooltip>
          </>
        )
    },
    enableSorting: false
    }
  ]

  const rawMaterialsPackingTrimColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'supplier_name',
      header: 'Supplier',
    },
    {
      accessorKey: 'date',
      header: 'Date',
      enableSorting: false
    },
    {
      accessorKey: 'item_code',
      header: 'Item',
      enableSorting: false
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: props => {
        const material = props.row.original.attributes.ritz_customer_brand_reference_code
        const materialDets = props.row.original.attributes
        const materialHeaders = props.row.original.headers
        return (
          <>
          {material}
          <RitzToolTip materialHeaders={materialHeaders} materialDetails={materialDets}/>
          </>
      );
      },
      enableSorting: false
    },
    {
      accessorKey: 'attributes.color',
      header: 'Color',
      enableSorting: false
    },
    {
      accessorKey: '',
      header: 'Shape',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: 'size_or_dimension',
      header: 'Size/Dimension',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '150px', height: '90px' }} />
        )
    },
    enableSorting: false
    },
    {
      accessorKey: 'total_quantity',
      header: 'Quantity',
      enableSorting: false,
      cell: props => {
        const total_quantity = props.row.original.total_quantity
        return `${total_quantity.quantity} ${total_quantity.quantity_units_display}`;
    },
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id

        return (
          <>
          <Tooltip title="Show All Club Materials">
            <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(in_house_material_id,'packagingTrims')}></EditIcon>
          </Tooltip>
          </>
        )
    },
    enableSorting: false
    }
  ]

  //  Left over table columns

  const leftOverFabricColumns: ColumnDef<any>[] = [
      {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'colorway_category',
      header: 'Colorway Type',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: props => {
        const material = props.row.original.attributes.ritz_customer_brand_reference_code
        const materialDets = props.row.original.attributes
        const materialHeaders = props.row.original.headers
        return (
          <>
          {material}
          <RitzToolTip materialHeaders={materialHeaders} materialDetails={materialDets}/>
          </>
      );
      }
    },
    {
      accessorKey: 'color',
      header: 'Color',
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '90px', height: '90px' }} />
        )
    }
    },
    {
      accessorKey: 'from_sao',
      header: 'From SAO',
    },
    {
      accessorKey: 'from_po',
      header: 'From PO',
      cell: ({ row }) => row.original.from_po ? row.original.from_po : '--',
    },      
    {
      accessorKey: 'aging',
      header: 'Aging (Months)',
    },
    {
      accessorKey: 'total_quantity',
      header: 'Quantity',
      cell: props => {
        return (
          `${props.row.original.total_quantity.quantity} ${props.row.original.total_quantity.quantity_units_display}`
        )
    }
      
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id
        return (
          <>
          <Tooltip title="Show All Club Materials">
          <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(in_house_material_id,'fabric')}></EditIcon>
          </Tooltip>
          </>
        )
    }
    }
  ]
  
  const leftOverSewingTrimColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'item',
      header: 'Item',
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Description',
    },
    {
      accessorKey: 'color',
      header: 'Color',
    },
    {
      accessorKey: '',
      header: 'Shape',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    }
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '90px', height: '90px' }} />
        )
    }
    },
    {
      accessorKey: 'from_sao',
      header: 'From SAO',
    },
    {
      accessorKey: 'from_po',
      header: 'From PO',
      cell: ({ row }) => row.original.from_po ? row.original.from_po : '--',
    },
    {
      accessorKey: 'aging',
      header: 'Aging (Months)',
    },
    {
      accessorKey: 'total_quantity',
      header: 'Quantity',
      cell: props => {
        return (
          `${props.row.original.total_quantity.quantity} ${props.row.original.total_quantity.quantity_units_display}`
        )
    }
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id

        return (
          <>
          <Tooltip title="Show All Club Materials">
            <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(in_house_material_id,'sewingTrims')}></EditIcon>
          </Tooltip>
          </>
        )
    }
    }
  ]
  
  const leftOverPackingTrimColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'plant_name',
      header: 'Plant',
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => row.original.date ? row.original.date : '--',
    },
    {
      accessorKey: 'item',
      header: 'Item',
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Description',
    },
    {
      accessorKey: 'color',
      header: 'Color',
      cell: ({ row }) => row.original.color ? row.original.color : '--',
    },
    {
      accessorKey: '',
      header: 'Shape',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    }
    },
    {
      accessorKey: 'size_or_dimension',
      header: 'Size/Dimension',
      cell: props => {
        const shape = props.row.original.shape
        return (
          <img src={shape} alt="Description" style={{ width: '110px', height: '110px' }} />
        )
    }
    },
    {
      accessorKey: '',
      header: 'Image',
      cell: props => {
        const image = props.row.original.image
        return (
          <img src={image} alt="Description" style={{ width: '90px', height: '90px' }} />
        )
    }
    },
    {
      accessorKey: 'total_quantity',
      header: 'Quantity',
      cell: props => {
        return (
          `${props.row.original.total_quantity.quantity} ${props.row.original.total_quantity.quantity_units_display}`
        )
    }
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: props => {
        const plant_id = props.row.original.plant_id
        const customer_id = props.row.original.customer_id
        const customer_name = props.row.original.customer_name
        const club_id = props.row.original.club_id
        const club_display_number = props.row.original.club_display_number
        const type = selection.selectedOrderSpecificType
        const in_house_material_id = props.row.original.in_house_material_id

        return (
          <>
          <Tooltip title="Show All Club Materials">
            <OpenInNewIcon sx={{ cursor: 'pointer', marginRight: 2 }} onClick={() => handleShowAllClubMaterials(event,plant_id,customer_id,customer_name,club_display_number,club_id,type)}></OpenInNewIcon>
          </Tooltip>

          <Tooltip title="Edit Material Details">
            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(in_house_material_id,'packagingTrims')}></EditIcon>
          </Tooltip>
          </>
        )
    }
    }
  ]

  const fetchGeneralMetaDataAndPlantWiseCustomerData = () => {
    setIsLoading(true);

    Promise.all([
        api.get(RestUrls.getGeneralInfoMetaDataURL()),
        api.get(VirtualWarehouseUrls.PlantWiseCustomerList())
    ])
        .then(([generalInfoResp, plantWiseCustomerResp]) => {
            const resPlantData = generalInfoResp?.data?.plants || [];
            const resPlantWiseCustomerData = plantWiseCustomerResp?.data || [];
            
            setData(prevData => ({
              ...prevData,
              plantData: [...resPlantData],
            }));
            setData(prevData => ({
              ...prevData,
              plantWiseCustomerData: [...resPlantWiseCustomerData],
            }));
        })
        .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
};

  const fetchData = (selectedPoClubId:any,specificStatus:any)=>{
    setIsLoading(true)
        api.get(VirtualWarehouseUrls.orderSpecificMaterialsListURL(selectedPoClubId,specificStatus)).then(resp => {
        const data = resp?.data|| [];
        setData(prevData => ({
          ...prevData,
          clubSupplierMaterialData: data,
        }));
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
    }

  const fetchAllData = (
    customer_id: any,
    material_category: any,
    plant_id: any,
    specific_status: any,
    currentPage: any,
    rowsPerPage: any,
    searchedText?: any,
    searchedField?: any
  ) => {
    setIsLoading(true);
    console.log(material_category,'material_categoryxxxxx')
    const url = searchedText
      ? VirtualWarehouseUrls.allPlantsMaterialsListURL(
          '',
          '',
          searchedText,
          searchedField,
          customer_id,
          material_category,
          plant_id,
          specific_status,
          currentPage + 1,
          rowsPerPage > 50 ? rowsPerPage : 50
        )
      : VirtualWarehouseUrls.allPlantsMaterialsListURL(
          '',
          '',
          '',
          '',
          customer_id,
          material_category,
          plant_id,
          specific_status,
          currentPage + 1,
          rowsPerPage > 50 ? rowsPerPage : 50
        );

    api
      .get(url)
      .then((resp) => {
        const data = resp?.data || [];
        console.log(data,'DATA')
        setAllSupplierMaterialData((prevState) => ({
          ...prevState,
          [material_category]: data,
        }));
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => setIsLoading(false));
  };

  function handleSearchedText(
    selectedMaterialType: any,
    searchedText: any,
    selectedCustomer: any,
    plantSelected: any,
    orderSpecificType: any,
    currentPage: any,
    rowsPerPage: any
  ) {
    const searchKeys = ['fabric', 'sewingTrims', 'packagingTrims'];
    function getSearchedField(selectedMaterialType: any, searchedText: any) {
      let searchedField;
      if (selectedMaterialType === "fabric") {
        searchedField = searchValueInMaterialData(allSupplierMaterialData.fabric, searchedText);
      } else if (selectedMaterialType === "sewingTrims") {
        searchedField = searchValueInMaterialData(allSupplierMaterialData.sewingTrims, searchedText);
      } else if (selectedMaterialType === "packagingTrims") {
        searchedField = searchValueInMaterialData(allSupplierMaterialData.packagingTrims, searchedText);
      }
      return searchedField;
    }

    searchKeys.forEach(key => {
      if (searchedText[key]) {
        const searchedField = getSearchedField(selectedMaterialType, searchedText[key]);
        fetchAllData(
          searchedText[key],
          searchedField,
          selectedCustomer.id,
          selectedMaterialType,
          plantSelected,
          orderSpecificType,
          currentPage[key],
          rowsPerPage[key]
        );
      }
    });

  }
  
  useEffect(() => {
    fetchGeneralMetaDataAndPlantWiseCustomerData()
    handleSearchedText(
      selection.selectedMaterialType,
      searchedText,
      selection.selectedCustomer,
      selection.plantSelected,
      selection.selectedOrderSpecificType,
      currentPage,
      rowsPerPage
    );
  }, []);

  // material wise pagination

  useEffect(() => {
    if(rowsPerPage.fabric > 50){
      fetchAllData(selection.selectedCustomer.id,selectedPageType.fabric,selection.plantSelected,selection.selectedOrderSpecificType,currentPage.fabric,rowsPerPage.fabric)
    }
  }, [rowsPerPage.fabric]);

  useEffect(() => {
    if(rowsPerPage.sewingTrims > 50){
      fetchAllData(selection.selectedCustomer.id,selectedPageType.sewingTrims,selection.plantSelected,selection.selectedOrderSpecificType,currentPage.sewingTrims,rowsPerPage.sewingTrims)
    }
  }, [rowsPerPage.sewingTrims]);

  useEffect(() => {
    if(rowsPerPage.packagingTrims > 50){
      fetchAllData(selection.selectedCustomer.id,selectedPageType.packagingTrims,selection.plantSelected,selection.selectedOrderSpecificType,currentPage.packagingTrims,rowsPerPage.packagingTrims)
    }
  }, [rowsPerPage.packagingTrims]);

  // Plant, Customer, Club, Type selection

  useEffect(() => {
    if(selection.plantSelected){
      handlePlantOnClick(selection.plantSelected)
    }
  }, [selection.plantSelected]);

  useEffect(() => {
    if(selection.selectedCustomer.id){
      if (selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers'){
        setState(prevState => ({
          ...prevState,
          showClubSelectingButtons: true,
        }));
        setState(prevState => ({
          ...prevState,
          showOrderSpecificTable: false,
        }));
      } else {
        setState(prevState => ({
          ...prevState,
          showClubSelectingButtons: false,
        }));
        setState(prevState => ({
          ...prevState,
          showOrderSpecificTable: true,
        }));
      }
    }
  }, [selection.selectedCustomer]);

  useEffect(() => {
    if(selection.clickedClubOptionButtonId == 2){
      setSelection(prevSelection => ({
        ...prevSelection,
        clickedClubOptionButtonId: 2,
      }));
      setState(prevState => ({
        ...prevState,
        showSelectedPOClub: true,
      }));
      setState(prevSelection => ({
        ...prevSelection,
        isPOClubSelected: true,
      }));
    }
  }, [selection.clickedClubOptionButtonId]);


  const fetchPathData = (inhouse_material_id:any)=>{
      api.get(VirtualWarehouseUrls.virtualWarehousePathLoadingDetailsURL(inhouse_material_id)).then(resp => {
        const data = resp?.data || '';
        setData(prevData => ({
          ...prevData,
          pathData: data,
        }));
      }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
    }

  useEffect(() => {
    if (inhouse_material_id !== null && inhouse_material_id !== undefined) {
      fetchPathData(inhouse_material_id)
    }
    }, [inhouse_material_id]);
  
  const handleClubMaterials = () => {
    if (data.pathData) {
      const plant_id = data.pathData?.plant_id;
      const customer_id = data.pathData?.customer_id;
      const customer_name = data.pathData?.customer_name;
      const club_display_number = data.pathData?.club_display_number;
      const club_id = data.pathData?.club_id;
      const type = data.pathData?.category;
  
      handleShowAllClubMaterials('', plant_id, customer_id, customer_name, club_display_number, club_id, type);
    }
  };
    
  useEffect(() => {
    handleClubMaterials();
  }, [data.pathData]);

// ON SEARCH CHANGE
    
    const handleSearchChange = (text: any, type: any) => {
      setSelection(prevSelection => ({
        ...prevSelection,
        selectedMaterialType: type,
      }));

      setSearchedText((prevSearchedText) => ({
        ...prevSearchedText,
        [type]: text,
      }));
    };

 // FABRIC ROW COUNT HANDLE

 const handleRowsCount = ({category, number, type}:any) => {
  setRowsPerPage(prevState => ({
    ...prevState,
    [category]: number,
  }));

  setSelectedPageType(prevState => ({
    ...prevState,
    [category]: type,
  }));
};

// PAGE NUMBER ON CHANGE

const handlePageNumber = (page: any, type: any, category: 'fabric' | 'sewingTrims' | 'packagingTrims') => {
  setCurrentPage(prevState => ({
    ...prevState,
    [category]: page
  }));

  setSelectedPageType(prevState => ({
    ...prevState,
    [category]: type
  }));
};


const handlePlantSelection = (event: any,newPlant: any) => {
  setSelection(prevSelection => ({
    ...prevSelection,
    selectedCustomer: { id: null, name: '' },
  }));
  setSelection(prevSelection => ({
    ...prevSelection,
    clickedClubOptionButtonId: null,
    plantSelected: newPlant || prevSelection.plantSelected,
  }));
};

const handlePlantOnClick = (newPlantId:any) => {
  setState(prevState => ({
    ...prevState,
    showOrderSpecificTable: false,
    isPOClubSelected: false,
    showCustomerSelection: true,
  }));

  setSelection(prevSelection => ({
    ...prevSelection,
    clickedClubOptionButtonId: null,
    plantSelected: newPlantId || prevSelection.plantSelected,
  }));
}

const handleCustomerSelect = (customer: { id: any, name: string }) => {
  console.log(selection.selectedCustomer,'selectedCustomer:::::')
  setSelection(prevSelection => ({
    ...prevSelection,
    selectedCustomer: customer,
  }));
};

const handleCustomerOnChange = (event:any) => {
  const cus_id = isNaN(parseInt(event?.target?.value)) ? event?.target?.value : parseInt(event?.target?.value);
  const cus_name = event?.target?.textContent
  setSelection(prevSelection => ({
    ...prevSelection,
    selectedCustomer: { id: cus_id, name: cus_name },
  }));
  setSelection(prevSelection => ({
    ...prevSelection,
    clickedClubOptionButtonId: null,
  }));
  setState(prevState => ({
    ...prevState,
    showSelectedPOClub: false,
  }));
  setState(prevState => ({
    ...prevState,
    showOrderSpecificTable: false,
  }));
  setSelection(prevSelection => ({
    ...prevSelection,
    selectedOrderSpecificType: '',
  }));
};

  const clubSelectingButtonsOnChange = (event:any) => {
    const selected_Id = parseInt(event.target.value)
    setSelection(prevSelection => ({
      ...prevSelection,
      clickedClubOptionButtonId: selected_Id,
    }));
    setSelection(prevSelection => ({
      ...prevSelection,
      selectedOrderSpecificType: '',
    }));
    if (selected_Id === 2){
      setState(prevState => ({
        ...prevState,
        showSelectedPOClub: true,
      }));
      setState(prevState => ({
        ...prevState,
        isPOClubModalOpen: true,
      }));
      setState(prevState => ({
        ...prevState,
        showOrderSpecificTable: false,
      }));
    } else{
      setState(prevState => ({
        ...prevState,
        showOrderSpecificTable: true,
      }));
      setState(prevState => ({
        ...prevState,
        showSelectedPOClub: false,
      }));
      setSelection(prevSelection => ({
        ...prevSelection,
        selectedPoClub: {po_display: '',club_id: null},
      }));
      
    }
  }

  const handlePlantWisePODetailsModalOnClose = () => {
    setState(prevState => ({
      ...prevState,
      isPOClubModalOpen: false,
    }));
    setState(prevState => ({
      ...prevState,
      showOrderSpecificTable: false,
    }));
  }

  const handleClickedPOClub = (poCLubId:any) => {
      setState(prevState => ({
        ...prevState,
        isPOClubModalOpen: false,
      }));
  }  

  const searchValueInMaterialData = (payload:any, searchText:any) => {
    for (let i = 0; i < payload.length; i++) {
      const item = payload[i];
      for (const key in item) {
        if (typeof item[key] === 'string' && item[key].includes(searchText)) {
          return key;
        } else if (typeof item[key] === 'object' && item[key] !== null) {
          for (const nestedKey in item[key]) {
            if (typeof item[key][nestedKey] === 'string' && item[key][nestedKey].includes(searchText)) {
              return nestedKey;
            }
          }
        }
      }
    }
    return null;
  };

  const handleOrderSpecificToggleOnChange = (event: any, type:any) => {
    let newType = type;
    if (event) {
      newType = event.target.value;
    }

    setSelection(prevSelection => ({
      ...prevSelection,
      selectedOrderSpecificType: newType,
    }));
    
      {newType === 'order_specific_raw_material' ? (
        (selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers')?(
          (selection.clickedClubOptionButtonId==2?(
            fetchData(selection.selectedPoClub.club_id,newType)
          ):(
            materialCategories.map((category:any, categoryIndex:any)=>(
              fetchAllData(
                selection.selectedCustomer.id,
                category,
                selection.plantSelected,
                newType,
                category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
                category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
              )
            ))
          ))
        ):(
            materialCategories.map((category:any, categoryIndex:any)=>(
              fetchAllData(
                selection.selectedCustomer.id,
                category,
                selection.plantSelected,
                newType,
                category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
                category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
              )
            ))
          )
      )
      : newType === 'left_over' ? (

        (selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers')?(
          (selection.clickedClubOptionButtonId==2?(
            fetchData(selection.selectedPoClub.club_id,newType)
          ):(
            materialCategories.map((category:any, categoryIndex:any)=>(
              fetchAllData(
                selection.selectedCustomer.id,
                category,
                selection.plantSelected,
                newType,
                category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
                category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
              )
            ))
          ))
        ):(
          materialCategories.map((category:any, categoryIndex:any)=>(
            fetchAllData(
              selection.selectedCustomer.id,
              category,
              selection.plantSelected,
              newType,
              category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
              category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
            )
          ))
          )
      )
      : newType === 'rejection' ? (
        (selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers')?(
          (selection.clickedClubOptionButtonId==2?(
            fetchData(selection.selectedPoClub.club_id,newType)
          ):(
            materialCategories.map((category:any, categoryIndex:any)=>(
              fetchAllData(
                selection.selectedCustomer.id,
                category,
                selection.plantSelected,
                newType,
                category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
                category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
              )
            ))
          ))
        ):(
          materialCategories.map((category:any, categoryIndex:any)=>(
            fetchAllData(
              selection.selectedCustomer.id,
              category,
              selection.plantSelected,
              newType,
              category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
              category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
            )
          ))
          )
      ) : (
        (selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers')?(
          (selection.clickedClubOptionButtonId==2?(
            fetchData(selection.selectedPoClub.club_id,newType)
          ):(
            materialCategories.map((category:any, categoryIndex:any)=>(
              fetchAllData(
                selection.selectedCustomer.id,
                category,
                selection.plantSelected,
                newType,
                category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
                category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
              )
            ))
          ))
        ):(
          materialCategories.map((category:any, categoryIndex:any)=>(
            fetchAllData(
              selection.selectedCustomer.id,
              category,
              selection.plantSelected,
              newType,
              category == 'fabric' ? currentPage.fabric : category == 'sewingTrims' ? currentPage.sewingTrims : category == 'packagingTrims' ? currentPage.packagingTrims : '',
              category == 'fabric' ? rowsPerPage.fabric : category == 'sewingTrims' ? rowsPerPage.sewingTrims : category == 'packagingTrims' ? rowsPerPage.packagingTrims : ''
            )
          ))
          )
      )}
  };

    const handlePoClubClick = () => {
        setState(prevState => ({
          ...prevState,
          isPOClubModalOpen: true,
        }));
    }

    const handlePoClubSelect = (data:any) => {
        setState(prevSelection => ({
          ...prevSelection,
          isPOClubSelected: true,
        }));
        setSelection(prevSelection => ({
          ...prevSelection,
          selectedPoClub: {po_display: data.po_display,club_id: data.club_id},
        }));
        setState(prevState => ({
          ...prevState,
          showSelectedPOClub: true,
        }));
    };

    const handleEditMaterialsModalClose = () => {
      setState(prevSelection => ({
        ...prevSelection,
        isEditMaterialsModalOpen: false,
      }));
    }
    
    const handleEditMaterialsModalSave = () => {
      setState(prevSelection => ({
        ...prevSelection,
        isEditMaterialsModalOpen: false,
      }));
      fetchAllData(selection.selectedCustomer.id,selection.editingMaterialCategory,selection.plantSelected,selection.selectedOrderSpecificType,currentPage.fabric,rowsPerPage.fabric)
    }

    return (
        <>
        { state.isEditMaterialsModalOpen && (
            <RitzModal
              open={state.isEditMaterialsModalOpen}
              onClose={handleEditMaterialsModalClose}
              maxWidth='lg'
              title='Edit Material Details'
              >
              <EditMaterials
                editingMaterialCategory={selection.editingMaterialCategory}
                selectedInHouseMaterialId={selection.selectedInHouseMaterialId}
                onSave={handleEditMaterialsModalSave}/>
            </RitzModal>
        )}
        
        {(state.isPOClubModalOpen && (selection.selectedCustomer.id !== 'all_customers' || selection.selectedCustomer.id !== null)  ) &&
            <RitzModal
                open={state.isPOClubModalOpen}
                onClose={handlePlantWisePODetailsModalOnClose}
                maxWidth='lg'
                title='Customer Wise PO Club List'
            >
            <PlantWisePODetails
                modalStatus={handleClickedPOClub} 
                onCustomerSelect={handleCustomerSelect}
                onPoClubSelect={handlePoClubSelect} 
                selectedCustomerNew={selection.selectedCustomer}
                plantSelected={selection.plantSelected}/>
            </RitzModal>
        }

        <Card sx={{padding: '20px'}}>
            {
                <Box >
                    <Typography variant="h1">Virtual Warehouse</Typography>
                    <Typography variant="h5" sx={{ marginBottom: '1em' }}>Select  Plant:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                    
                    <ToggleButtonGroup
                        color="primary"
                        value={selection.plantSelected}
                        exclusive
                        onChange={handlePlantSelection}
                        aria-label="Platform"
                        style={{ marginBottom: '20px' }} 
                        >
                        <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} value='all_plants'>All</ToggleButton>
                              {data.plantData && data.plantData.map((plant: any) => 
                        <ToggleButton key={plant.id} style={{ marginRight: '10px', minWidth: '150px', maxWidth: '100%', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} value={plant.id}>{plant.name}</ToggleButton>
                    )}
                    </ToggleButtonGroup> 
                    </Box>
                </Box>
            }

        {selection.plantSelected && state.showCustomerSelection && (
            <Box sx={{ gap: '0.5em', display: 'flex', flexDirection: 'column', flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Select Customer:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                            color="primary"
                            value={selection.selectedCustomer.id}
                            exclusive
                            onChange={(event) => handleCustomerOnChange(event)}
                            aria-label="Platform"
                            style={{ marginBottom: '20px' }}
                            >   <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px' }} value='all_customers'>All</ToggleButton>
                            {plant?.customers?.map((customer:any) => (
                                <ToggleButton key={customer.id} style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}value={customer.id}>{customer.name}</ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
            </Box>
        )}
        {(selection.selectedCustomer.id && state.showClubSelectingButtons) && (
                <Box >
                    <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Select Club Option:</Typography>
                        <Box >
                            <ToggleButtonGroup
                                color="primary"
                                value={selection.clickedClubOptionButtonId}
                                exclusive
                                onChange={(event) =>clubSelectingButtonsOnChange(event)}
                                aria-label="Platform"
                                style={{ marginBottom: '20px' }}
                                > 
                                  <ToggleButton style={{ marginRight: '10px', width: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px', }}value={1}>{'All PO Clubs'}</ToggleButton>
                                  <ToggleButton style={{ marginRight: '10px', width: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px', }}value={2}>{'Single PO Club'}</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                </Box>
          )}

          { state.showSelectedPOClub && state.isPOClubSelected && selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers' && selection.selectedCustomer.id !== null && (
            
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <Button
                      sx={{border: '1px solid #E0E0E0',
                          borderRadius: '4px',
                          padding: '3px 16px',
                          width:'250px',
                          length:'200px',
                          color:'#373A40',
                          marginTop:'0.5em',
                          display: 'flex',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          }}
                      startIcon={<OpenInNewIcon />}
                      onClick={handlePoClubClick}
                      >
                      <Typography variant="h6">{selection.selectedPoClub?.po_display}</Typography>
                  </Button>
              </Box>
          )}

{  (state.isPOClubSelected || state.showOrderSpecificTable) && (
  <>
  <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Select Order Specific Type:</Typography>
      {
        <ToggleButtonGroup
        color="primary"
        value={selection.selectedOrderSpecificType}
        exclusive
        onChange={handleOrderSpecificToggleOnChange}
        aria-label="Platform"
        sx={{
          '& .MuiToggleButton-root': {
            borderRadius: 0,
            padding: '16px 32px',
          },
        }}
      >
        <ToggleButton value="order_specific_raw_material">Raw Material</ToggleButton>
        <ToggleButton value="left_over">Left Over</ToggleButton>
        <ToggleButton value="rejection">Rejection</ToggleButton>
        <ToggleButton value="returnables">Returnables</ToggleButton>
      </ToggleButtonGroup>
      }
  </>
)} 

{
  selection.selectedOrderSpecificType === 'order_specific_raw_material' ? (
    <Box>
      {selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers' ? (
        selection.clickedClubOptionButtonId === 2 ? (
          <Box>
    {isLoading ? <DefaultLoader/> : <>
            {data.clubSupplierMaterialData.map((supplier, index) => (
              <Box key={index}>
                <Typography variant="h5" sx={{ marginTop: '1em', color: 'primary.main' }}>
                  {supplier.supplier_name}
                </Typography>
                {supplier.supplier_material_details.map((material:any, materialIndex:any) => (
                  <Box key={materialIndex}>
                    <Typography variant="h6" sx={{ marginTop: '1em' }}>
                      {material.material_category_label}
                    </Typography>
                    {material.material_details?.length === 0 ? (
                      <Alert key={materialIndex} severity='info' sx={{ mb: 2, marginTop: '2em' }}>
                        No {material.material_category_label} Details Available
                      </Alert>
                    ) : (
                      <>
                        {/* RAW - FABRIC */}
                        {material?.material_category === 'fabric' && (
                          <TableContainer key={materialIndex} sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                            <Table sx={{ padding: '16px', marginTop: '2em' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Colorway Type
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Description
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Color
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Image
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Excess
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} colSpan={3}>
                                    Saving
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Total Quantity
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Action
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Bulk
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Cutting
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Production
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {material.material_details.map((material_detail:any, index:any) => (
                                  <TableRow key={index}>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail.colorway_category}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <Box>
                                        {material_detail.attributes.ritz_customer_brand_reference_code}
                                      </Box>
                                      <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail.attributes} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail.color}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail.image} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail.excess.quantity} ${material_detail.excess.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail.bulk_saving.quantity} ${material_detail.bulk_saving.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail.cutting_saving.quantity} ${material_detail.cutting_saving.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail.production_saving.quantity} ${material_detail.production_saving.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {`${material_detail.total_quantity.quantity} ${material_detail.total_quantity.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {<Tooltip title="Edit Material Details">
                                        <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail.in_house_material_id,'fabric')}></EditIcon>
                                      </Tooltip>}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody> 
                            </Table>
                          </TableContainer>
                        )}
                        {/* RAW - SEWING TRIMS */}
                        {material?.material_category === 'sewing_trim' && (
                          <TableContainer sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                            <Table sx={{ padding: '16px', marginTop: '2em' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Item
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Description
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Color
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Shape
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Image
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Excess Quantity
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Sewing Quantity
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Total Quantity
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Action
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                               <TableBody>
                                {material.material_details.map((material_detail:any, index:any) => (
                                  <TableRow key={index}>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail.item}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <Box>
                                        {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                      </Box>
                                      <RitzToolTip materialHeaders={material_detail?.headers} materialDetails={material_detail?.attributes} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail?.color}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail?.excess?.quantity} ${material_detail?.excess?.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {`${material_detail?.sewing_quantity?.quantity} ${material_detail?.sewing_quantity?.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {<Tooltip title="Edit Material Details">
                                        <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'sewingTrims')}></EditIcon>
                                      </Tooltip>}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody> 
                            </Table>
                          </TableContainer>
                        )}
                        {/* RAW - PACKAGING TRIMS */}
                        {material?.material_category === 'packaging_trim' && (
                          <TableContainer sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                            <Table sx={{ padding: '16px', marginTop: '2em' }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Date
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Item
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Description
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Color
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Shape
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Size / Dimension
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Image
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                                    Quantity
                                  </TableCell>
                                  <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} rowSpan={2}>
                                    Action
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {material.material_details.map((material_detail:any, index:any) => (
                                  <TableRow key={index}>
                                    <TableCell align="center" sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail?.date ? material_detail?.date : "--"}
                                    </TableCell>
                                    <TableCell align="center" sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail?.item}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <Box>
                                        {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                      </Box>
                                      <RitzToolTip materialHeaders={material_detail?.headers} materialDetails={material_detail?.attributes} />
                                    </TableCell>
                                    <TableCell align="center" sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {material_detail?.color ? material_detail?.color : "--"}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail?.size_dimension} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      <img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} />
                                    </TableCell>
                                    <TableCell align="center" sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                    {`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                      {<Tooltip title="Edit Material Details">
                                        <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'packagingTrims')}></EditIcon>
                                      </Tooltip>}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
          </>}
          </Box>
        ) : (
          <>
          <Box>
            <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
            {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.fabric}
                columns={rawMaterialsFabricColumns}
              />
            </>}
          
            <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
            {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.sewingTrims}
                columns={rawMaterialsSewingTrimColumns}
              />
            </>}
          
            <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
            {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.packagingTrims}
                columns={rawMaterialsPackingTrimColumns}
              />
            </>}  
          </Box>
          </>
        )
      ) : (
        <Box>
          {state.showTable && (
          <>
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
          {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.fabric}
                columns={rawMaterialsFabricColumns}
                serverSideRendering={true}
                onSearchTextChange={(selectText:any) => handleSearchChange(selectText, 'fabric')}
                pagination={true}
                onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'fabric', 'fabric')}
                onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'fabric', number: rowsCount, type: 'fabric' })}
              />
          </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.sewingTrims}
              columns={rawMaterialsSewingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'sewingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'sewing', 'sewingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'sewingTrims', number: rowsCount, type: 'sewingTrims' })}
            />
          </>} 
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.packagingTrims}
              columns={rawMaterialsPackingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'packagingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'packing', 'packagingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'packagingTrims', number: rowsCount, type: 'packagingTrims' })}
            />
          </>}
          </>
          )}
        </Box>
      )
      }
    </Box>
  ) : selection.selectedOrderSpecificType === 'left_over' ? (
          <Box>
          {selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers' ? (
            selection.clickedClubOptionButtonId === 2 ? (
              <Box>
 {isLoading ? <DefaultLoader/> : <>
                 {data.clubSupplierMaterialData.map((supplier, index) => (
                     <Box key={index}>
                       <Typography variant="h5" sx={{ marginTop: '1em', color: 'primary.main'}}>{supplier.supplier_name}</Typography>
                       {supplier.supplier_material_details.map((material:any, materialIndex:any) => (
                         <Box key={materialIndex}>
                         <Typography variant="h6" sx={{ marginTop: '1em' }}>{material.material_category_label}</Typography>
                         {material.material_details?.length === 0 ? (
                           <Alert key={materialIndex} severity='info' sx={{ mb: 2, marginTop: '2em' }}>
                             No {material.material_category_label} Details Available 
                           </Alert>
                         ) : (
                            <>
                            {/* left - FABRIC */}
                            {material?.material_category =='fabric' &&(
                                 <TableContainer key={materialIndex} sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                                 <Table sx={{ padding: '16px', marginTop: '2em' }}>
                                   <TableHead>
                                     <TableRow>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Colorway Type</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                                       <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                     </TableRow>
                                   </TableHead>
                                   <TableBody>
                                     {material?.material_details.map((material_detail:any, index:any) => (
                                       <TableRow key={index}>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.colorway_category}</TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                           <Box>
                                             {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                           </Box>
                                           <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail?.attributes} />
                                       </TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                                         <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging}</TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                         <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          {<Tooltip title="Edit Material Details">
                                            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail.in_house_material_id,'fabric')}></EditIcon>
                                          </Tooltip>}
                                        </TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </TableContainer>
                            )}
                            {/* left - SEWING TRIMS */}
                            {material?.material_category =='sewing_trim' &&(
                                <TableContainer sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                                <Table sx={{ padding: '16px', marginTop: '2em' }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Item</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Shape</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>  
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                                      <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                  {material.material_details.map((material_detail:any, index:any) => (
                                      <TableRow key={index}>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail.item}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                         <Box>
                                           {material_detail.attributes.ritz_customer_brand_reference_code}
                                         </Box>
                                         <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail.attributes} />
                                       </TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging ? material_detail?.aging : "--"}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          {<Tooltip title="Edit Material Details">
                                            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'sewingTrims')}></EditIcon>
                                          </Tooltip>}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                             )}
                             {/* left - PACKAGING TRIMS */}
                             {material?.material_category =='packaging_trim' &&(
                               <TableContainer  sx={{marginRight: '16px', marginTop: '0.5em'}}>
                               <Table sx={{ padding: '16px', marginTop: '2em'}}>
                                   <TableHead>
                                       <TableRow>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Date</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Item</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Description</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Color</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Shape</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Size / Dimention</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Image</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Quantity</TableCell>
                                           <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                       </TableRow>
                                   </TableHead>
                                   <TableBody>
                                   {material.material_details.map((material_detail:any, index:any) => (
                                       <TableRow key={index}>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.date ? material_detail?.date : "--"}</TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.item}</TableCell>
                                           <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                             <Box>
                                               {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                             </Box>
                                             <RitzToolTip materialHeaders={material_detail?.headers} materialDetails={material_detail?.attributes} />
                                           </TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}> {material_detail?.color ? material_detail?.color : "--"}</TableCell>
                                           <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                           <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                           <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                           <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                           <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                            {<Tooltip title="Edit Material Details">
                                              <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'packagingTrims')}></EditIcon>
                                            </Tooltip>}
                                          </TableCell>
                                       </TableRow>
                                   ))}
                                   </TableBody>
                               </Table>
                              </TableContainer>
                             )}
                            </>
                         )}
                         </Box>
                       ))}
                     </Box>
                 ))}
            </>}
           </Box>
          ):(
              <Box>
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                <RitzTable 
                  data={allSupplierMaterialData.fabric}
                  columns={leftOverFabricColumns}
                />
                </>}                                                        
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                <RitzTable 
                  data={allSupplierMaterialData.sewingTrims}
                  columns={leftOverSewingTrimColumns}
                />
                </>}
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                <RitzTable 
                  data={allSupplierMaterialData.packagingTrims}
                  columns={leftOverPackingTrimColumns}
                />
                </>}
              </Box>
          )
         ):(
          <Box>
            <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
            {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.fabric}
                columns={leftOverFabricColumns}
                serverSideRendering={true}
                onSearchTextChange={(selectText:any) => handleSearchChange(selectText, 'fabric')}
                pagination={true}
                onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'fabric', 'fabric')}
                onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'fabric', number: rowsCount, type: 'fabric' })}
              />
            </>} 
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable
              data={allSupplierMaterialData.sewingTrims}
              columns={leftOverSewingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'sewingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'sewing', 'sewingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'sewingTrims', number: rowsCount, type: 'sewing' })}
            />
           </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <> 
            <RitzTable 
              data={allSupplierMaterialData.packagingTrims}
              columns={leftOverPackingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'packagingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'packing', 'packagingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'packagingTrims', number: rowsCount, type: 'packing' })}
            />
          </>}
              </Box>
         )}
        </Box>
      ) : selection.selectedOrderSpecificType === 'rejection' ? (
        <Box>
        {selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers' ?(
          selection.clickedClubOptionButtonId === 2 ? (
            <Box>
          {isLoading ? <DefaultLoader/> : <>
                      {data.clubSupplierMaterialData.map((supplier, index) => (
                      <Box key={index}>
                        <Typography variant="h5" sx={{ marginTop: '1em', color: 'primary.main'}}>{supplier?.supplier_name}</Typography>
                        {supplier?.supplier_material_details.map((material:any, materialIndex:any) => (
                          <Box>
                          <Typography variant="h6" sx={{ marginTop: '1em' }}>{material?.material_category_label}</Typography>
                          {material?.material_details?.length === 0 ? (
                            <Alert key={materialIndex} severity='info' sx={{ mb: 2, marginTop: '2em' }}>
                              No {material?.material_category_label} Details Available 
                            </Alert>
                          ) : (
                             <>
                             {/* REJECTION - FABRIC */}
                             {material?.material_category =='fabric' &&(
                                  <TableContainer key={materialIndex} sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                                  <Table sx={{ padding: '16px', marginTop: '2em' }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Colorway Type</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {material?.material_details.map((material_detail:any, index:any) => (
                                        <TableRow key={index}>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.colorway_category}</TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                            <Box>
                                              {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                            </Box>
                                            <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail?.attributes} />
                                          </TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                                          <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging}</TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                          <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          {<Tooltip title="Edit Material Details">
                                            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail.in_house_material_id,'fabric')}></EditIcon>
                                          </Tooltip>}
                                          </TableCell>
                                      </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                             )}
                             {/* REJECTION - SEWING TRIMS */}
                             {material?.material_category =='sewing_trim' &&(
                                 <TableContainer sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                                 <Table sx={{ padding: '16px', marginTop: '2em' }}>
                                   <TableHead>
                                    <TableRow>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Item</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Shape</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>  
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                                        <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                      </TableRow>
                                   </TableHead>
                                   <TableBody>
                                   {material?.material_details.map((material_detail:any, index:any) => (
                                      <TableRow key={index}>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail.item}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          <Box>
                                            {material_detail.attributes.ritz_customer_brand_reference_code}
                                          </Box>
                                          <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail.attributes} />
                                          </TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging ? material_detail?.aging : "--"}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          {<Tooltip title="Edit Material Details">
                                            <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'sewingTrims')}></EditIcon>
                                          </Tooltip>}
                                        </TableCell>
                                      </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </TableContainer>
                              )}
                              {/* REJECTION - PACKAGING TRIMS */}
                              {material?.material_category =='packaging_trim' &&(
                                <TableContainer  sx={{marginRight: '16px', marginTop: '0.5em'}}>
                                <Table sx={{ padding: '16px', marginTop: '2em'}}>
                                    <TableHead>
                                      <TableRow>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Date</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Item</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Description</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Color</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Shape</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Size / Dimention</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Image</TableCell>
                                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Quantity</TableCell>
                                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                                      </TableRow> 
                                    </TableHead>
                                    <TableBody>
                                    {material?.material_details.map((material_detail:any, index:any) => (
                                      <TableRow key={index}>
                                        <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.date ? material_detail?.date : "--"}</TableCell>
                                        <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.item}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                          <Box>
                                            {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                          </Box>
                                          <RitzToolTip materialHeaders={material_detail?.headers} materialDetails={material_detail?.attributes} />
                                        </TableCell>
                                        <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}> {material_detail?.color ? material_detail?.color : "--"}</TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                                        <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                                        <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                         {<Tooltip title="Edit Material Details">
                                           <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'packagingTrims')}></EditIcon>
                                         </Tooltip>}
                                       </TableCell>
                                    </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                               </TableContainer>
                              )}
                             </>
                          )}
                          </Box>
                        ))}
                      </Box>
                  ))}
              </>}
          </Box>
        ):(
          <Box>
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.fabric}
              columns={leftOverFabricColumns}
            />
          </>}                                                                
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.sewingTrims}
              columns={leftOverSewingTrimColumns}
            />
          </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Packages:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.packagingTrims}
              columns={leftOverPackingTrimColumns}
            />
          </>}
        </Box>
        )
      ):(
        <Box>
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
          {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.fabric}
                columns={leftOverFabricColumns}
                serverSideRendering={true}
                onSearchTextChange={(selectText:any) => handleSearchChange(selectText, 'fabric')}
                pagination={true}
                onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'fabric', 'fabric')}
                onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'fabric', number: rowsCount, type: 'fabric' })}
              />
          </>}   
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.sewingTrims}
              columns={leftOverSewingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText:any) => handleSearchChange(selectText, 'sewingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'sewing', 'sewingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'sewingTrims', number: rowsCount, type: 'sewing' })}
            />
          </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.packagingTrims}
              columns={leftOverPackingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'packagingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'packing', 'packagingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'packagingTrims', number: rowsCount, type: 'packing' })}
            />
          </>}
        </Box>
      )}
      </Box>
      ) : selection.selectedOrderSpecificType === 'returnables' ? (
        <Box>
        {selection.plantSelected !== 'all_plants' && selection.selectedCustomer.id !== 'all_customers' ?(
          selection.clickedClubOptionButtonId === 2 ? (
            <Box>
 {isLoading ? <DefaultLoader/> : <>
            {data.clubSupplierMaterialData.map((supplier, index) => (
          <Box key={index}>
            <Typography variant="h5" sx={{ marginTop: '1em', color: 'primary.main'}}>{supplier?.supplier_name}</Typography>
            {supplier?.supplier_material_details.map((material:any, materialIndex:any) => (
              <Box>
              <Typography variant="h6" sx={{ marginTop: '1em' }}>{material?.material_category_label}</Typography>
              {material?.material_details?.length === 0 ? (
                <Alert key={materialIndex} severity='info' sx={{ mb: 2, marginTop: '2em' }}>
                  No {material?.material_category_label} Details Available 
                </Alert>
              ) : (
                 <>
                 {/* Ret - FABRIC */}
                 {material?.material_category =='fabric' &&(
                      <TableContainer key={materialIndex} sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                      <Table sx={{ padding: '16px', marginTop: '2em' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Colorway Type</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {material?.material_details.map((material_detail:any, index:any) => (
                            <TableRow key={index}>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.colorway_category}</TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                                <Box>
                                  {material_detail?.attributes?.ritz_customer_brand_reference_code}
                                </Box>
                                <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail?.attributes} />
                            </TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                              <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging}</TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                              <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                              {<Tooltip title="Edit Material Details">
                                <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail.in_house_material_id,'fabric')}></EditIcon>
                              </Tooltip>}
                            </TableCell>
                          </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                 )}
                 {/* Ret - SEWING TRIMS */}
                 {material?.material_category =='sewing_trim' &&(
                     <TableContainer sx={{ marginRight: '16px', marginTop: '0.5em' }}>
                     <Table sx={{ padding: '16px', marginTop: '2em' }}>
                       <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Item</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Description</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Color</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Shape</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Image</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From SAO</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >From PO</TableCell>  
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Aging</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Total Quantity</TableCell>
                          <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                          </TableRow>
                       </TableHead>
                       <TableBody>
                       {material?.material_details.map((material_detail:any, index:any) => (
                          <TableRow key={index}>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail.item}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                              <Box>
                                {material_detail.attributes.ritz_customer_brand_reference_code}
                              </Box>
                              <RitzToolTip materialHeaders={material_detail.headers} materialDetails={material_detail.attributes} />
                            </TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.color}</TableCell>
                            <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                            <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_sao}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.from_po ? material_detail?.from_po : "--"}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{material_detail?.aging ? material_detail?.aging : "--"}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                              {<Tooltip title="Edit Material Details">
                                <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'sewingTrims')}></EditIcon>
                              </Tooltip>}
                            </TableCell>
                         </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </TableContainer>
                  )}
                  {/* Ret - PACKAGING TRIMS */}
                  {material?.material_category =='packaging_trim' &&(
                    <TableContainer  sx={{marginRight: '16px', marginTop: '0.5em'}}>
                    <Table sx={{ padding: '16px', marginTop: '2em'}}>
                        <TableHead>
                          <TableRow>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Date</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Item</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Description</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Color</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Shape</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Size / Dimention</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Image</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center'}}>Quantity</TableCell>
                            <TableCell align="center" sx={{ border: '1px solid #D3D3D3', backgroundColor: '#f0f0f0', textAlign: 'center' }} >Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                        {material?.material_details.map((material_detail:any, index:any) => (
                          <TableRow key={index}>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.date ? material_detail?.date : "--"}</TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{material_detail?.item}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                              <Box>
                                {material_detail?.attributes?.ritz_customer_brand_reference_code}
                              </Box>
                              <RitzToolTip materialHeaders={material_detail?.headers} materialDetails={material_detail?.attributes} />
                            </TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}> {material_detail?.color ? material_detail?.color : "--"}</TableCell>
                            <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                            <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.shape} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                            <TableCell sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}><img src={material_detail?.image} alt="Description" style={{ width: '90px', height: '90px' }} /></TableCell>
                            <TableCell align="center" sx={{border: '1px solid #D3D3D3', textAlign: 'center'}}>{`${material_detail?.total_quantity?.quantity} ${material_detail?.total_quantity?.quantity_units_display}`}</TableCell>
                            <TableCell sx={{ border: '1px solid #D3D3D3', textAlign: 'center' }}>
                             {<Tooltip title="Edit Material Details">
                               <EditIcon sx={{ cursor: 'pointer'}} onClick={() => handleEditMaterialDetails(material_detail?.in_house_material_id,'packagingTrims')}></EditIcon>
                             </Tooltip>}
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                   </TableContainer>
                  )}
                 </>
              )}
              </Box>
            ))}
          </Box>
           ))} 
</>}
          </Box>
        ):(
            <Box>
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                  <RitzTable 
                    data={allSupplierMaterialData.fabric}
                    columns={leftOverFabricColumns}
                  />
                </>}                                                               
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                  <RitzTable 
                  data={allSupplierMaterialData.sewingTrims}
                  columns={leftOverSewingTrimColumns}
                  />
                </>}
                <Typography variant="h6" sx={{ marginTop: '1em' }}>Packages:</Typography>
                {isLoading ? <DefaultLoader/> : <>
                  <RitzTable 
                  data={allSupplierMaterialData.packagingTrims}
                  columns={leftOverPackingTrimColumns}
                  />
                </>}
            </Box>
        )
      ):(
          <Box>
            <Typography variant="h6" sx={{ marginTop: '1em' }}>Fabric:</Typography>
            {isLoading ? <DefaultLoader/> : <>
              <RitzTable 
                data={allSupplierMaterialData.fabric}
                columns={leftOverFabricColumns}
                serverSideRendering={true}
                onSearchTextChange={(selectText:any) => handleSearchChange(selectText, 'fabric')}
                pagination={true}
                onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'fabric', 'fabric')}
                onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'fabric', number: rowsCount, type: 'fabric' })}
              />
             </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Sewing Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <> 
            <RitzTable 
              data={allSupplierMaterialData.sewingTrims}
              columns={leftOverSewingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'sewingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'sewing', 'sewingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'sewingTrims', number: rowsCount, type: 'sewing' })}
            />
            </>}
          <Typography variant="h6" sx={{ marginTop: '1em' }}>Packaging Trims:</Typography>
          {isLoading ? <DefaultLoader/> : <>
            <RitzTable 
              data={allSupplierMaterialData.packagingTrims}
              columns={leftOverPackingTrimColumns}
              serverSideRendering={true}
              onSearchTextChange={(selectText: any)=>handleSearchChange(selectText,'packagingTrims')}
              pagination={true}
              onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber, 'packing', 'packagingTrims')}
              onPerPageCountChange={(rowsCount: any) => handleRowsCount({ category: 'packagingTrims', number: rowsCount, type: 'packing' })}
            />
            </>}
          </Box>
      )}
      </Box>
      ) : (
        <Box>{null}</Box>
      )}
</Card>
</>
);
}
export default VirtualWarehouse;