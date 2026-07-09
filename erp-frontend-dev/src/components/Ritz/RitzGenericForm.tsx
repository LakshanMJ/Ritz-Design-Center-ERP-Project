import { useState } from "react";
import { Box, Typography, TextField, Select, Checkbox, Radio, Switch, Slider, Button, MenuItem, IconButton, InputAdornment, FormControlLabel, InputLabel, Autocomplete, ListItemText } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import FormErrorMessage from "@/components/FormErrorMessage";
import SaveSpinner from "../SaveSpinner";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import RitzSearchableSelection from "./RitzSearchableSelection";
import RitzSearchableServerRender from "./RitzSearchableServerRender";

interface FormField {
    name: string;
    label: string;
    value: any;
    passwordType?: any;
    optionText: any;
    optionValue: any;
    optionUrl?: any;
    isRequired?: boolean;
    isMulti?: boolean;
    type:
    | "text"
    | "email"
    | "number"
    | "password"
    | "confirm_password"
    | "select"
    | "checkbox"
    | "autocomplete_multi_select"
    | "radio"
    | "switch"
    | "slider"
    | "contained"
    | "outlined"
    | "searchable"
    | "searchable_server_render";
    options?: any[];
    onClick?: () => void;
    passwordIconOnclick?: () => void;
    passwordIconOnMouseDown?: () => void;
    color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
    // onChange?: (name: string, value: any) => void;
    onChange?: any;
    isDisabled?: boolean;
    isMultiple?: boolean;
}

interface Props {
    fields: any;
    submitId: number;
    onSumbit?: () => void;
    errors: any;
    isSaving: boolean;
    showSubmitButton?: boolean; 
}

const RitzGenericForm: React.FC<Props> = ({ fields, submitId, onSumbit, errors, isSaving , showSubmitButton = true}: any) => {
    const [formData, setFormData] = useState<Record<string, any>>({});

    const [showPassword, setShowPassword] = useState(false);
    const handleTogglePassword = () => setShowPassword(!showPassword);

    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const handleTogglePasswordConfirm = () => setShowPasswordConfirm(!showPasswordConfirm);

    const renderField = (field: FormField) => {
        const { name, label, type, options, optionText, optionValue, color, value, passwordType, onClick, onChange,isDisabled , optionUrl} = field;

        switch (type) {
            case "text":
                return (
                    <Box>
                        <TextField
                            id={name}
                            name={name}
                            value={value || ''}
                            autoComplete="new-username"
                            onChange={onChange}
                            fullWidth
                            type="text"
                            color={color}
                            disabled={isDisabled}
                        />
                    </Box>
                );
            case "email":
                return (
                    <Box>
                        <TextField
                            id={name}
                            name={name}
                            value={value || ''}
                            autoComplete="new-username"
                            onChange={onChange}
                            fullWidth
                            type="email"
                            color={color}
                        />
                    </Box>
                );
            case "password":
                return (
                    <Box>
                        <TextField
                            id={name}
                            name={name}
                            value={value || ''}
                            onChange={onChange}
                            autoComplete="new-password"
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            color={color}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleTogglePassword}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                );
            case "confirm_password":
                return (
                    <Box>
                        <TextField
                            id={name}
                            name={name}
                            value={value || ''}
                            autoComplete="new-password"
                            onChange={onChange}
                            fullWidth
                            type={showPasswordConfirm ? "text" : "password"}
                            color={color}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleTogglePasswordConfirm}>
                                            {showPasswordConfirm ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                );
            case "number":
                return (
                    <Box>
                        <TextField
                            id={name}
                            name={name}
                            value={value || ''}
                            autoComplete="off"
                            onChange={onChange}
                            fullWidth
                            type="number"
                            color={color}
                            sx={{
                                '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                                    WebkitAppearance: 'none',
                                    display: 'none',
                                    margin: 0,
                                },
                                '& input[type=number]': {
                                    'MozAppearance': 'textfield',
                                },
                            }}
                        />
                    </Box>
                );
            case "select":
                return (
                    <Box>
                        <Select
                            id={name}
                            name={name}
                            labelId={name}
                            value={options?.length ? value : 'noOption'}
                            fullWidth
                            onChange={onChange}
                            disabled={isDisabled}
                        >
                            {options?.length ? (
                                options.map((option: any) => (
                                    <MenuItem key={option?.[optionValue]} value={option?.[optionValue]}>
                                        {option[field.optionText]}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem disabled value="noOption">
                                    There aren't any options for this attribute to show.
                                </MenuItem>
                            )}
                        </Select>
                    </Box>
                );
            case "checkbox":
                return (
                    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridGap: '10px', marginTop: '-10px' }}>
                        {options?.map((option) => (
                            <FormControlLabel
                                key={option.id}
                                control={
                                    <Checkbox
                                        name={name}
                                        color={color}
                                        checked={value}
                                        onChange={onChange}
                                    />
                                }
                                label={option.name}
                            />
                        ))}
                    </Box>
                );
            case "autocomplete_multi_select":
                return (
                    <Box>
                        <Autocomplete
                            multiple
                            id={name}
                            options={options || []}
                            getOptionLabel={(option) => option[optionText]}
                            value={value || []}
                            onChange={(_, newValues) => {
                                const hasDuplicateIds = newValues.some((brand, index) =>
                                    newValues.findIndex((otherBrand) => otherBrand.id === brand.id) !== index
                                );
                                if (hasDuplicateIds) {
                                    const similarDuplicateValues = newValues.filter((brand, index, array) =>
                                        array.findIndex((otherBrand) => otherBrand.id === brand.id) !== index
                                    );
                                    const filteredBrands = newValues.filter(
                                        (brand) => !similarDuplicateValues.some((duplicateBrand) => duplicateBrand.id === brand.id)
                                    );
                                    onChange(name, filteredBrands);
                                } else {
                                    onChange(name, newValues);
                                }
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    fullWidth
                                    // error={Boolean(errors?.[name])}
                                    // helperText={errors?.[name]}
                                />
                            )}
                            renderOption={(props, option) => {
                                const isSelected = value.some((val: any) => val[optionValue] === option[optionValue]);
                                const backgroundColor = isSelected ? '#e0f7fa' : 'transparent';
                                return (
                                    <MenuItem {...props} style={{ backgroundColor }} data-option-id={option[optionValue]}>
                                        <Checkbox
                                            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                            checkedIcon={<CheckBoxIcon fontSize="small" />}
                                            style={{ marginRight: 8 }}
                                            checked={isSelected}
                                        />
                                        <ListItemText primary={option[optionText]} />
                                    </MenuItem>
                                );
                            }}
                            disabled={isDisabled}
                            disableCloseOnSelect
                            isOptionEqualToValue={(option, value) => option[optionValue] === value[optionValue]}
                        />
                    </Box>
                );
            case "radio":
                return (
                    <Box>
                        {options?.map((option) => (
                            <Box key={option}>
                                <Radio
                                    name={name}
                                    value={option || ''}
                                    checked={value === option}
                                    onChange={onChange}
                                />
                                <Typography>{option}</Typography>
                            </Box>
                        ))}
                    </Box>
                );
            case "switch":
                return (
                    <Box>
                        <Switch
                            id={name}
                            name={name}
                            checked={value ?? false}
                            onChange={onChange}
                            disabled={isDisabled}
                        />
                    </Box>
                );
            case "slider":
                return (
                    <Box>
                        <Slider
                            id={name}
                            name={name}
                            value={formData[name] ?? 0}
                            onChange={(event: any, value: any) =>
                                setFormData((prevFormData) => ({ ...prevFormData, [name]: value }))
                            }
                            marks
                            min={0}
                            max={10}
                        />
                    </Box>
                );
            case "contained":
                return (
                    <Button variant="contained" color={color ?? "primary"} onClick={field.onClick}>
                        {label}
                    </Button>
                );
            case "outlined":
                return (
                    <Button variant="outlined" color={color ?? "primary"} onClick={field.onClick}>
                        {label}
                    </Button>
                );
                case "searchable":
                    return (
                        <Box>
                            <RitzSearchableSelection
                                id={name}
                                name={name}
                                options={options || []}
                                selectedValue={value}
                                handleOnChange={(selectedValue: any) => onChange(name, selectedValue)}
                                optionValue={optionValue}
                                optionText={optionText}
                                isReadOnly={isDisabled}
                            />
                        </Box>
                    );
                    case "searchable_server_render":
                        return (
                            <Box>
                                <RitzSearchableServerRender
                                    id={name}
                                    name={name}
                                    optionValue={optionValue}
                                    optionText={optionText}
                                    selectedValue={value}
                                    handleOnChange={(selectedValue: any) => onChange(name, selectedValue)}
                                    optionUrl={optionUrl}
                                    isReadOnly={isDisabled}
                                />
                            </Box>
                        );
            default:
                return null;
        }
    };

    return (
        <Box>
            {fields.map((field: any) => (
                <Box key={field.name} marginBottom={3}>
                    {!['contained', 'outlined'].includes(field.type) && 
                        <InputLabel sx={{ mb: 1 }} htmlFor={field.name}>{field.label}</InputLabel>
                    }

                    {renderField(field)}

                    {(!['contained', 'outlined'].includes(field.type) && errors?.[field.name]) && 
                        <FormErrorMessage message={errors?.[field.name]} />
                    }
                </Box>
            ))}
            {showSubmitButton && ( 
                <Box style={{ display: 'flex', justifyContent: 'end' }}>
                    <Button variant="contained" color="primary" onClick={onSumbit} disabled={isSaving}>
                        {isSaving && <SaveSpinner />}{submitId > 0 ? "Update" : "Create"}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default RitzGenericForm;