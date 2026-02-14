import { useAppForm } from "@/components/form";
import { type FunctionComponent } from "react";
interface CreateProductFormProps {
  
}
 
const CreateProductForm: FunctionComponent<CreateProductFormProps> = () => {
  const from = useAppForm({
    defaultValues: {},
    onSubmit: ({ value }) => console.log("🚀 ~ CreateProductForm ~ value:", value)
  })
  return (
    <>
      <form
        id='create-product-form'
        onSubmit={(e) => {
          e.preventDefault();
          from.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <from.AppField
          name="productName"
          children={(field) => <field.FormTextField type="text" label="Назва продукту" />}
        />

      </form>
    </>
  );
}
 
export default CreateProductForm;