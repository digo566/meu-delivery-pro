import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, QrCode, FileText, CheckCircle, Copy, LogOut } from "lucide-react";
import grapeLogo from "@/assets/grape-logo.png";
import { useNavigate } from "react-router-dom";

const Subscription = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [billingType, setBillingType] = useState("PIX");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    cpfCnpj: "",
    email: "",
    phone: "",
    // Credit card fields
    cardNumber: "",
    cardHolder: "",
    cardExpMonth: "",
    cardExpYear: "",
    cardCcv: "",
    postalCode: "",
    addressNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.cpfCnpj || !formData.email) {
      toast.error("Preencha nome, CPF/CNPJ e email");
      return;
    }

    if (billingType === "CREDIT_CARD") {
      if (!formData.cardNumber || !formData.cardHolder || !formData.cardExpMonth || !formData.cardExpYear || !formData.cardCcv) {
        toast.error("Preencha todos os dados do cartão");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        action: "create-subscription",
        name: formData.name,
        cpfCnpj: formData.cpfCnpj,
        email: formData.email,
        phone: formData.phone,
        billingType,
      };

      if (billingType === "CREDIT_CARD") {
        payload.creditCard = {
          holderName: formData.cardHolder,
          number: formData.cardNumber.replace(/\D/g, ""),
          expiryMonth: formData.cardExpMonth,
          expiryYear: formData.cardExpYear,
          ccv: formData.cardCcv,
        };
        payload.postalCode = formData.postalCode;
        payload.addressNumber = formData.addressNumber;
      }

      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentInfo(data.paymentInfo);

      if (billingType === "CREDIT_CARD" && data.status === "active") {
        toast.success("Assinatura ativada com sucesso!");
        setStep("success");
      } else if (billingType === "CREDIT_CARD") {
        toast.error("Pagamento não confirmado. Verifique os dados do cartão.");
      } else {
        setStep("payment");
      }
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(err.message || "Erro ao criar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (paymentInfo?.copyPaste) {
      navigator.clipboard.writeText(paymentInfo.copyPaste);
      toast.success("Código Pix copiado!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={grapeLogo} alt="Grape" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Ative sua Assinatura</h1>
          <p className="text-muted-foreground mt-2">
            Para acessar o painel e ativar sua loja, assine o plano Grape.
          </p>
          <p className="text-2xl font-bold text-primary mt-3">R$ 1,00/mês</p>
          <p className="text-xs text-muted-foreground">(valor promocional de teste)</p>
        </div>

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados para Assinatura</CardTitle>
              <CardDescription>Preencha seus dados para gerar o pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone (opcional)</Label>
                  <Input
                    placeholder="(85) 99999-8888"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-3 pt-2">
                  <Label className="text-base font-semibold">Forma de Pagamento</Label>
                  <RadioGroup value={billingType} onValueChange={setBillingType} className="grid grid-cols-3 gap-3">
                    <div>
                      <RadioGroupItem value="PIX" id="pix" className="peer sr-only" />
                      <Label
                        htmlFor="pix"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <QrCode className="h-6 w-6" />
                        <span className="text-sm font-medium">Pix</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="CREDIT_CARD" id="credit_card" className="peer sr-only" />
                      <Label
                        htmlFor="credit_card"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <CreditCard className="h-6 w-6" />
                        <span className="text-sm font-medium">Cartão</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="BOLETO" id="boleto" className="peer sr-only" />
                      <Label
                        htmlFor="boleto"
                        className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      >
                        <FileText className="h-6 w-6" />
                        <span className="text-sm font-medium">Boleto</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Credit Card Fields */}
                {billingType === "CREDIT_CARD" && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-semibold">Dados do Cartão</Label>
                    <Input
                      placeholder="Número do cartão"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      maxLength={19}
                    />
                    <Input
                      placeholder="Nome no cartão"
                      value={formData.cardHolder}
                      onChange={(e) => setFormData({ ...formData, cardHolder: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Mês (MM)"
                        value={formData.cardExpMonth}
                        onChange={(e) => setFormData({ ...formData, cardExpMonth: e.target.value })}
                        maxLength={2}
                      />
                      <Input
                        placeholder="Ano (AAAA)"
                        value={formData.cardExpYear}
                        onChange={(e) => setFormData({ ...formData, cardExpYear: e.target.value })}
                        maxLength={4}
                      />
                      <Input
                        placeholder="CVV"
                        value={formData.cardCcv}
                        onChange={(e) => setFormData({ ...formData, cardCcv: e.target.value })}
                        maxLength={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="CEP"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      />
                      <Input
                        placeholder="Nº endereço"
                        value={formData.addressNumber}
                        onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Processando..." : "Assinar agora - R$ 1,00/mês"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "payment" && paymentInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {paymentInfo.type === "PIX" ? "Pague com Pix" : "Pague o Boleto"}
              </CardTitle>
              <CardDescription>
                Após o pagamento, seu acesso será liberado automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentInfo.type === "PIX" && (
                <>
                  {paymentInfo.qrCode && (
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${paymentInfo.qrCode}`}
                        alt="QR Code Pix"
                        className="w-64 h-64 rounded-lg border"
                      />
                    </div>
                  )}
                  {paymentInfo.copyPaste && (
                    <div className="space-y-2">
                      <Label>Pix Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Input value={paymentInfo.copyPaste} readOnly className="text-xs" />
                        <Button variant="outline" size="icon" onClick={handleCopyPix}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {paymentInfo.type === "BOLETO" && (
                <>
                  {paymentInfo.identificationField && (
                    <div className="space-y-2">
                      <Label>Linha Digitável</Label>
                      <div className="flex gap-2">
                        <Input value={paymentInfo.identificationField} readOnly className="text-xs" />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentInfo.identificationField);
                            toast.success("Código copiado!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {paymentInfo.bankSlipUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(paymentInfo.bankSlipUrl, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Abrir Boleto
                    </Button>
                  )}
                </>
              )}

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Já pagou? Clique abaixo para verificar:
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Verificar Pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="pt-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Assinatura Ativada!</h2>
              <p className="text-muted-foreground">
                Seu acesso ao painel Grape está liberado. Aproveite!
              </p>
              <Button size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
                Acessar Painel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Logout button */}
        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
