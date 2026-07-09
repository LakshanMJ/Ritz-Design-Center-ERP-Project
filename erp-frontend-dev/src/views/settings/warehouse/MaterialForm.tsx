import { useEffect, useState } from "react";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import { getConsumptionMeasuringUnitsURL } from "@/helpers/constants/RestUrls";
import { SupplierInquiryMaterialCodeURL, CustomerBrandMaterialCodeURL, InHouseMaterialCreateURL, InHouseMaterialUpdateURL } from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";

interface MaterialFormProps {
  editData: any;
  selectedMaterialCategory: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const MaterialForm = ({
  editData,
  selectedMaterialCategory,
  onSuccess,
  onCancel,
}: MaterialFormProps) => {
  const [consumptionUnits, setConsumptionUnits] = useState<any[]>([]);
  const [formData, setFormData] = useState(editData);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  

  useEffect(() => {
    api.get(getConsumptionMeasuringUnitsURL())
      .then((response) => {
        setConsumptionUnits(response.data.all);
      })
      .catch((error) => {
        toast.error("Failed to fetch consumption units");
      });
  }, []);

  useEffect(() => {
    setFormData(editData);
  }, [editData]);

  const handleSave = () => {
    setIsSaving(true);
    const sanitizedData = {
      ...formData,
      cutting_width: formData.cutting_width === "" ? null : formData.cutting_width,
      cutting_width_units: formData.cutting_width_units === "" ? null : formData.cutting_width_units,
    };

    const request = {
      method: sanitizedData.id ? 'put' : 'post',
      url: sanitizedData.id ? InHouseMaterialUpdateURL(sanitizedData.id) : InHouseMaterialCreateURL(),
      data: sanitizedData,
    };

    api(request)
      .then(() => {
        toast.success(sanitizedData.id ? "Material updated successfully" : "Material added successfully");
        onSuccess();
      })
      .catch((error) => {
        if (error.response?.data) {
          setErrors(error.response.data);
        } else {
          toast.error(getDefaultError(error?.response?.status) || "Failed to save data");
        }
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const fields = [
    ...(formData?.id
      ? [
          {
            name: "material_type",
            label: "Material Type",
            type: "text",
            value: formData?.material_type,
            onChange: (e: any) =>
              setFormData({
                ...formData,
                material_type: e.target.value,
              }),
            isDisabled: true,
          },
        ]
      : []),
      {
        name: "supplier_material",
        label: "Supplier Material Reference Code",
        type: "searchable_server_render",
        value: formData?.supplier_material,
        optionText: "supplier_material_reference_code",
        optionValue: "id",
        optionUrl: (searchText: any) =>
          SupplierInquiryMaterialCodeURL(
            selectedMaterialCategory,
            searchText, 
            searchText ? '' : formData?.supplier_material || '' 
          ),
        onChange: (name: string, value: any) =>
          setFormData({ ...formData, supplier_material: value }),
      },
      {
        name: "customer_brand_material",
        label: "Customer Brand Material Code",
        type: "searchable_server_render",
        value: formData?.customer_brand_material,
        optionText: "customer_brand_material_code",
        optionValue: "id",
        optionUrl: (searchText: any) =>
          CustomerBrandMaterialCodeURL(
            selectedMaterialCategory,
            searchText, 
            searchText ? '' : formData?.customer_brand_material || ''
          ),
        onChange: (name: string, value: any) =>
          setFormData({ ...formData, customer_brand_material: value }),
      },
    {
      name: "available_quantity",
      label: "Available Quantity",
      type: "number",
      value: formData?.available_quantity,
      onChange: (e: any) =>
        setFormData({
          ...formData,
          available_quantity: e.target.value,
        }),
    },
    {
      name: "available_quantity_units",
      label: "Available Quantity Unit",
      type: "select",
      value: formData?.available_quantity_units,
      options: consumptionUnits,
      optionText: "display_value",
      optionValue: "value",
      onChange: (e: any) =>
        setFormData({
          ...formData,
          available_quantity_units: e.target.value,
        }),
    },
    {
      name: "quantity",
      label: "Initial Quantity",
      type: "number",
      value: formData?.quantity,
      onChange: (e: any) =>
        setFormData({
          ...formData,
          quantity: e.target.value,
        }),
    },
    {
      name: "quantity_units",
      label: "Initial Quantity Unit",
      type: "select",
      value: formData?.quantity_units,
      options: consumptionUnits,
      optionText: "display_value",
      optionValue: "value",
      onChange: (e: any) =>
        setFormData({
          ...formData,
          quantity_units: e.target.value,
        }),
    },
    ...(selectedMaterialCategory === "fabric" ||
      (selectedMaterialCategory === "" && formData?.material_type === "fabric")
      ? [
          {
            name: "cutting_width",
            label: "Cutting Width",
            type: "number",
            value: formData?.cutting_width,
            onChange: (e: any) =>
              setFormData({
                ...formData,
                cutting_width: e.target.value,
              }),
          },
          {
            name: "cutting_width_units",
            label: "Cutting Width Unit",
            type: "select",
            value: formData?.cutting_width_units,
            options: consumptionUnits,
            optionText: "display_value",
            optionValue: "value",
            onChange: (e: any) =>
              setFormData({
                ...formData,
                cutting_width_units: e.target.value,
              }),
          },
        ]
      : []),
  ];

  return (
    <RitzGenericForm
      fields={fields}
      submitId={formData?.id}
      onSumbit={handleSave}
      errors={errors}
      isSaving={isSaving}
    />
  );
};

export default MaterialForm;