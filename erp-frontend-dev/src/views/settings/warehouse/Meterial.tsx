import { useState, useEffect, useRef } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, CardContent, IconButton, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete'; 
import RitzTable from '@/components/Ritz/RitzTable';
import RitzModal from '@/components/Ritz/RitzModal';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { getConsumptionMeasuringUnitsURL } from '@/helpers/constants/RestUrls';
import { InHouseMaterialListURL, InHouseMaterialDeleteURL } from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import toast from "react-hot-toast";
import { formatAmount, getDefaultError } from "@/helpers/Utilities";
import POAllocationForm from '@/views/settings/warehouse/POAllocation';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MaterialForm from './MaterialForm';

const InhouseMaterials = () => {
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState<string | null>('');
  const [data, setData] = useState<any>({});
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); 
  const [deleteData, setDeleteData] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isPOAllocationOpen, setIsPOAllocationOpen] = useState(false);
  const [poAllocationData, setPOAllocationData] = useState(null);
  
  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const tableRef = useRef(null);

  const materialCategories = [
    { id: "fabric", name: "Fabric" },
    { id: "sewing_trim", name: "Sewing Trims" },
    { id: "packaging_trim", name: "Packaging" },
  ];

  const fetchData = ({
    pageIndex: paramPageIndex,
    pageSize: paramPageSize,
  }: {
    pageIndex?: number,
    pageSize?: number,
  } = {}) => {
    setIsTableLoading(true);
    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const categoryParam = selectedMaterialCategory || '';

    api.get(InHouseMaterialListURL(categoryParam, pageIndexValue + 1, pageSizeValue))
      .then((response) => {
        setData(response.data || {});
        setTotalCount(response.data.count || 0);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status) || "Failed to fetch data");
      })
      .finally(() => {
        setIsLoading(false);
        setIsTableLoading(false);
      });
  };

  const handleMaterialCategoryChange = (event: any, newCategory: string | null) => {
    setSelectedMaterialCategory(newCategory);
  };

  const handleEdit = (row: any) => {
    setEditData(row);
    setIsEditing(true);
  };

  const handleAdd = () => {
    setEditData({
      id: null,
      supplier_material: null,
      customer_brand_material_code: "",
      available_quantity: "",
      available_quantity_units: "",
      quantity: "",
      quantity_units: "",
      cutting_width: "",
      cutting_width_units: "",
    });
    setIsEditing(true);
  };

  const handleSaveSuccess = () => {
    setIsEditing(false);
    setEditData(null);
    fetchData();
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    setEditData(null);
    setEditErrors({});
  };

  const handleDelete = (row: any) => {
    setDeleteData(row); 
    setIsDeleting(true); 
  };

  const confirmDelete = () => {
    if (!deleteData) return;

    const deleteURL = InHouseMaterialDeleteURL(deleteData.id);

    api.delete(deleteURL)
      .then(() => {
        toast.success("Material deleted successfully");
        fetchData();
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status) || "Failed to delete material");
      })
      .finally(() => {
        setIsDeleting(false); 
        setDeleteData(null); 
      });
  };

  const handleCloseDeleteModal = () => {
    setIsDeleting(false); 
    setDeleteData(null);
  };

  const handlePOAllocation = (row: any) => {
    setPOAllocationData(row);
    setIsPOAllocationOpen(true);
  };

  const handleClosePOAllocationModal = () => {
    setIsPOAllocationOpen(false);
    setPOAllocationData(null);
  };

  const handlePageNumberChange = (newPageIndex: number) => {
    setPageIndex(newPageIndex);
    fetchData({ pageIndex: newPageIndex });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageIndex(0);
    setPageSize(newPageSize);
    fetchData({ pageIndex: 0, pageSize: newPageSize });
  };

  useEffect(() => {
    fetchData();
  }, [selectedMaterialCategory]);

  const columns = [
    { accessorKey: "material_type", header: "Material Type" },
    { accessorKey: "supplier_material_code", header: "Supplier Material Reference Code" },
    { accessorKey: "customer_brand_material_code", header: "Customer Brand Material Code" },
    {
      accessorKey: "available_quantity",
      header: "Available Quantity",
      cell: (info: any) =>
        info.row.original.available_quantity
          ? `${formatAmount(info.row.original.available_quantity)} ${info.row.original.available_quantity_units_display || '--'}`
          : '--',
    },
    {
      accessorKey: "quantity",
      header: "Initial Quantity",
      cell: (info: any) =>
        info.row.original.quantity
          ? `${formatAmount(info.row.original.quantity)} ${info.row.original.quantity_units_display || '--'}`
          : '--',
    },
    ...(selectedMaterialCategory === "fabric" || selectedMaterialCategory === ""
      ? [
          {
            accessorKey: "cutting_width",
            header: "Cutting Width",
            cell: (info: any) =>
              info.row.original.cutting_width
                ? `${formatAmount(info.row.original.cutting_width)} ${info.row.original.cutting_width_units_display || '--'}`
                : '--',
          },
        ]
      : []),
    {
      id: "actions",
      header: "Actions",
      cell: (info: any) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleEdit(info.row.original)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(info.row.original)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handlePOAllocation(info.row.original)} 
            color="primary"
          >
            <AssignmentIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {isDeleting && (
        <RitzModal open={isDeleting} onClose={handleCloseDeleteModal} title="Confirm Delete">
          <Typography variant="body1">
            Are you sure you want to delete this material?
          </Typography>
          <Box sx={{ marginTop: '1em', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="contained" color="secondary" onClick={confirmDelete}>
              Yes, Delete
            </Button>
            <Button variant="outlined" onClick={handleCloseDeleteModal}>
              Cancel
            </Button>
          </Box>
        </RitzModal>
      )}

      {isEditing && (
        <RitzModal 
          open={isEditing} 
          onClose={handleCloseModal} 
          title={editData?.id ? "Edit Material" : "Add Material"}
        >
          <MaterialForm
            editData={editData}
            selectedMaterialCategory={selectedMaterialCategory}
            onSuccess={handleSaveSuccess}
            onCancel={handleCloseModal}
          />
        </RitzModal>
      )}

      {isPOAllocationOpen && (
        <RitzModal open={isPOAllocationOpen} onClose={handleClosePOAllocationModal} title="PO Allocation" maxWidth="lg" fullWidth={true}>
          <POAllocationForm data={poAllocationData} onClose={handleClosePOAllocationModal}     onSaveSuccess={() => {
      fetchData(); 
    }}/>
        </RitzModal>
      )}

      <CardContent>
        <Box>
          <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Material Category</Typography>
          <Box sx={{ display: 'flex' }}>
            <ToggleButtonGroup
              color="primary"
              value={selectedMaterialCategory}
              exclusive
              onChange={handleMaterialCategoryChange}
              aria-label="Material Categories"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
            >
              <ToggleButton
                style={{
                  height: '4em',
                  minWidth: '150px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '5px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  marginBottom: '10px',
                }}
                value=""
              >
                All
              </ToggleButton>
              {materialCategories.map((category) => (
                <ToggleButton
                  key={category.id}
                  style={{
                    height: '4em',
                    minWidth: '150px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '5px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                  value={category.id}
                >
                  {category.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>
        {isLoading ? (
          <DefaultLoader />
        ) : (
          <>
            <Box sx={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAdd} 
              >
                Add Material
              </Button>
            </Box>
            <Box sx={{ marginTop: '1em' }}>
              <RitzTable
                title="In House Material"
                data={data.results || []}
                columns={columns}
                tableRef={tableRef}
                serverSideRendering={true}
                totalCount={totalCount}
                onPageNumberChange={handlePageNumberChange}
                onPerPageCountChange={handlePageSizeChange}
                isLoading={isTableLoading}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Box>
  );
};

export default InhouseMaterials;