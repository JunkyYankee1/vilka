"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";

type Address = {
  id: string;
  label: string;
  details: string;
};

const defaultAddresses: Address[] = [
  {
    id: "a1",
    label: "улица Кибальчича, 2 к4",
    details: "Москва · кв. 74, подъезд 1, этаж 10",
  },
  {
    id: "a2",
    label: "Московский проспект, 73 к3 лит А",
    details: "Санкт-Петербург · кв. 706, этаж 7, Отель vertical",
  },
  {
    id: "a3",
    label: "улица Студенческая, 22 к3",
    details: "Москва · кв. 58, подъезд 6, этаж 4",
  },
];

type AddressModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (label: string) => void;
};

const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
}) => {
  const [step, setStep] = useState<"list" | "add">("list");
  const [selectedId, setSelectedId] = useState<string>(
    defaultAddresses[0]?.id ?? ""
  );
  const [city, setCity] = useState("Москва");
  const [street, setStreet] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("list");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (address: Address) => {
    setSelectedId(address.id);
    onSelectAddress(address.label);
    onClose();
  };

  const handleSaveNewAddress = () => {
    const label =
      street.trim().length > 0
        ? street.trim()
        : `${city.trim()}, новый адрес`;
    onSelectAddress(label);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-3xl rounded-[32px] bg-white p-6 sm:p-8 shadow-vilka-soft">
        {/* Верхняя панель */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (step === "list" ? onClose() : setStep("list"))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {step === "list" ? "Выбрать адрес" : "Добавить адрес"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "list" ? (
          <>
            <div className="flex flex-col gap-2">
              {defaultAddresses.map((addr) => {
                const selected = addr.id === selectedId;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelect(addr)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-surface-soft ${
                      selected ? "bg-surface-soft" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {addr.label}
                      </div>
                      <div className="text-xs text-slate-500">
                        {addr.details}
                      </div>
                    </div>
                    <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected ? "vilka-radio-primary" : "border-slate-300 bg-white"
                    }`}
                    >
                    {selected && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
            type="button"
            onClick={() => setStep("add")}
            className="vilka-btn-primary mt-6 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
            >
            Новый адрес
            </button>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {/* Левая часть — карта-заглушка */}
              <div className="flex h-72 items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-500">
                Здесь будет карта
              </div>

              {/* Правая часть — форма адреса */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Город
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-2xl bg-surface-soft px-3 py-2 text-sm text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Улица, дом, квартира
                  </div>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Например: Студенческая, 22 к3, кв. 58"
                    className="mt-1 w-full rounded-2xl bg-surface-soft px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    Комментарий для курьера
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Подъезд, этаж, код домофона..."
                    className="mt-1 w-full resize-none rounded-2xl bg-surface-soft px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <button
            type="button"
            onClick={handleSaveNewAddress}
            className="vilka-btn-primary mt-6 flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold"
            >
            Сохранить адрес
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AddressModal;
