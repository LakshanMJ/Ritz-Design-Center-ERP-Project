

class ModelReferenceCodeMixin:
    MODEL_REFERENCE_CODE_PREFIX = None
    # Override this in the model
    def get_reference_code_postfix(self):
        return None

    def append_reference_code_postfix(self, codes):
        ref_code = ''
        for code in codes:
            if code:
                ref_code += '-' + str(code)
        return ref_code.strip().strip("-")

    @property
    def verbose_reference_code(self):
        reference_codes = [str(self.id)]
        if self.MODEL_REFERENCE_CODE_PREFIX:
            reference_codes = [f"{self.MODEL_REFERENCE_CODE_PREFIX}{self.id:06}", ]

        ref_code = self.get_reference_code_postfix()
        if ref_code:
            reference_codes.append(ref_code)
        reference_code = self.append_reference_code_postfix(reference_codes)
        return reference_code
