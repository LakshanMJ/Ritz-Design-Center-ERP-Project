class DeleteItem {

    constructor() {
        this.deleted_ids = []
    }

    strikeThroughDiv(deletebutton, parent_class, restore_button_class) {
        deletebutton.parent().closest(parent_class).addClass('strikethroughdiv');
        deletebutton.parent().find(restore_button_class).removeClass('d-none');
        deletebutton.addClass('d-none');
    }

    setDeleteInputValue(delete_input_id) {
        console.log(this.deleted_ids.toString())
        $(delete_input_id).val(this.deleted_ids.toString());
    }

    deleteItem(deletebutton, delete_input_id, data_attribute='id', ) {
        let id = deletebutton.data(data_attribute);
        if (this.deleted_ids.indexOf(id) < 0) {
            this.deleted_ids.push(id);
        }
        this.setDeleteInputValue(delete_input_id);
    }

    undoDeleteItem(restorebutton, delete_input_id, data_attribute='id') {
        let id = restorebutton.data(data_attribute);
        this.deleted_ids.pop(id);
        this.setDeleteInputValue(delete_input_id);
    }

    undoStrikeThroughDiv(restorebutton, parent_class, delete_button_class) {
        restorebutton.parent().closest(parent_class).removeClass('strikethroughdiv');
        restorebutton.parent().find(delete_button_class).removeClass('d-none');
        restorebutton.addClass('d-none');
    }

}

class DynamicHTMLElement {
    static new_element = 'new';
    static edit_element = 'edit';

    constructor(name_prefix, type='new') {
        this.name_prefix = name_prefix;
        this.type = type;// new or edit
        this.parent_div_class = `${name_prefix}div`;

    }
    appendHTML(html, element) {
        element.append(html);
    }

    deleteParentNodeOfElement(element) {
        element.parent().closest(`.${this.parent_div_class}`).remove();
    }

    static getDeleteSuffix() {
        return 'deletebutton';
    }

    getDeleteIcon(additional_class='') {
        return `
               <i class="fa fa-regular fa-trash ${this.name_prefix}${this.constructor.getDeleteSuffix()} ${additional_class}" 
                    data-type="${this.type}"></i>
                `;
    }

    getLabel(label_text, for_id="") {
        return `<label class="form-label" for="${for_id}">${label_text}</label>`
    }
}

class DynamicInput extends DynamicHTMLElement{
    constructor(name_prefix, type, inputtype='text', classes='', ids='') {
        super(name_prefix, type);
        this.classes = classes;
        this.ids = ids;
        this.inputtype = inputtype;
    }

    getInput(index, value='') {
        return `<input type="${this.inputtype}" name="${index}${this.name_prefix}" 
                        value="${value}" class="${this.classes}" id="${this.ids}"/>`;
    }

}

class DynamicSingleSelect extends DynamicHTMLElement {

    constructor(items, name_prefix) {
        super(name_prefix);
        this.items = items;
        this.select_options = this.getOptions();

    }

    getOptions() {
        let options = this.items;
        let select_options = "<option value=''>Select</option>";
        for (let i=0; i < options.length; i++) {
            select_options += `<option value='${options[i].value}'>${options[i].name}</option>`;
        }
        return select_options;
    }

    getSelect(index) {
        return `<select name='${this.name_prefix}${index}' data-count='${index}'>${this.select_options}</select>`;
    }

    buildSelect(index, include_delete) {
        let delete_html = '';
        if (include_delete) {
            delete_html = this.getDeleteIcon();
        }
        let select_html = this.getSelect(index);
        let select = `<div class="mt-3 ${this.parent_div_class}" style="width: 100%;">${select_html} &nbsp;${delete_html}</div>`;
        return select;
    }
}

$(document).ready(function() {

    $("body").on("click", ".dynamic-data-delete-button", function (){
        let deleted_items_field_name = $(this).data('fieldname');
        let delete_inp = $(`[name="${deleted_items_field_name}"]`)
        let current_deleted_items = delete_inp.val();
        let current_deleted_item_ids = current_deleted_items.split(",")
        let delete_record_id = $(this).data('id').toString();
        let parentdiv = $(this).data('parentdiv');
        let delete_icon = `<i class="fa fa-regular fa-trash delete-icon"></i>`;
        let restore_icon = `<i class="fa-solid fa-rotate-left restore-icon"></i>`;

        if (current_deleted_item_ids.includes(delete_record_id)) {
            $(this).closest(`div.${parentdiv}`).removeClass('edit-delete-strikethrough');
            let deleted_ids = current_deleted_item_ids.filter(w => w !== delete_record_id)
            delete_inp.val(deleted_ids.toString());
            $(this).find(".fa-rotate-left").remove();
            $(this).append(delete_icon);

        } else {
            $(this).closest(`div.${parentdiv}`).addClass('edit-delete-strikethrough');
            current_deleted_item_ids.push(delete_record_id);
            delete_inp.val(current_deleted_item_ids.toString());

            $(this).find(".fa-trash").remove();
            $(this).append(restore_icon);
        }
    });

    $("body").on("click", ".dynamic-data-new-delete-button", function () {
        let parent_div = $(this).data('closest-parent-div');
        $(this).closest(`.${parent_div}`).remove();
    });
});

function getDictValue(dict, key, default_value='') {
    let value = dict[key];
    if (value == undefined)
        value = default_value;
    return value;
}
