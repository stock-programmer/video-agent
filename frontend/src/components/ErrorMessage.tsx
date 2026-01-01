export function ErrorMessage({ message }: { message: string }) {
  return <div className="bg-red-50 text-red-600 p-4 rounded">{message}</div>;
}
