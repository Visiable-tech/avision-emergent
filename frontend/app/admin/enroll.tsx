import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, Btn } from '@/src/admin/ui';

const METHODS = ['cash', 'upi', 'card', 'admin_grant'];

export default function AdminEnroll() {
  const { user_id: preUserId, product_id: preProdId } = useLocalSearchParams<{ user_id?: string; product_id?: string }>();
  const router = useRouter();

  const [studentQ, setStudentQ] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [productQ, setProductQ] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Prefill from query params
  useEffect(() => {
    if (preUserId) {
      api.admin.studentDetail(preUserId).then((d: any) => setSelectedStudent(d?.student)).catch(() => {});
    }
    if (preProdId) {
      api.productDetail(preProdId).then((p: any) => setSelectedProduct(p)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced student search
  useEffect(() => {
    if (selectedStudent || studentQ.length < 2) { setStudentResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const d: any = await api.admin.students(studentQ, 8, 0);
        setStudentResults(d.students || []);
      } catch (e) { console.warn(e); }
    }, 250);
    return () => clearTimeout(t);
  }, [studentQ, selectedStudent]);

  // Debounced product search
  useEffect(() => {
    if (selectedProduct) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const d: any = await api.admin.products(undefined, productQ || undefined, 12, 0);
        setProductResults(d.products || []);
      } catch (e) { console.warn(e); }
    }, 250);
    return () => clearTimeout(t);
  }, [productQ, selectedProduct]);

  // Prefill amount from product offer_price
  useEffect(() => {
    if (selectedProduct && !amount) setAmount(String(selectedProduct.offer_price ?? selectedProduct.price ?? ''));
  }, [selectedProduct, amount]);

  const submit = async () => {
    if (!selectedStudent) return Alert.alert('Pick a student');
    if (!selectedProduct) return Alert.alert('Pick a product');
    const amt = parseInt(amount || '0', 10);
    if (isNaN(amt) || amt < 0) return Alert.alert('Enter a valid amount (or 0 for grant)');
    setBusy(true);
    try {
      const r = await api.admin.enroll({
        user_id: selectedStudent.user_id,
        product_id: selectedProduct.id,
        amount_inr: amt,
        method,
        note: note.trim() || undefined,
      });
      setResult(r);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setSelectedStudent(null);
    setSelectedProduct(null);
    setStudentQ(''); setProductQ('');
    setAmount(''); setNote(''); setMethod('cash'); setResult(null);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="Manual Enrollment"
        subtitle="Offline pay-at-centre or admin grant"
        action={<Btn label="Reset" icon="refresh" variant="ghost" onPress={reset} />}
      />

      {result ? (
        <AdminCard style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.okBadge}><Ionicons name="checkmark" size={22} color="#FFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.okTitle}>Enrollment created</Text>
              <Text style={s.okSub}>Order <Text style={{ fontWeight: '900', color: theme.colors.brand }}>{result.order.avision_order_id}</Text> • ₹{Number(result.order.total).toLocaleString('en-IN')} • {result.order.channel}</Text>
            </View>
            <Btn label="Enroll another" icon="add-circle" onPress={reset} />
          </View>
        </AdminCard>
      ) : null}

      {/* STUDENT */}
      <AdminCard style={{ padding: 20 }}>
        <Text style={s.step}>STEP 1 — Choose student</Text>
        {selectedStudent ? (
          <View style={s.selected}>
            <View style={s.selAvatar}><Text style={s.selAvatarTxt}>{(selectedStudent.name || 'A').charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.selName}>{selectedStudent.name}</Text>
              <Text style={s.selMeta}>{selectedStudent.avision_id || '—'} • {selectedStudent.email}</Text>
            </View>
            <Btn small variant="ghost" label="Change" onPress={() => setSelectedStudent(null)} />
          </View>
        ) : (
          <>
            <TextInput
              style={s.input}
              placeholder="Search by name, email, phone, or AV-ID"
              placeholderTextColor={theme.colors.mutedLight}
              value={studentQ}
              onChangeText={setStudentQ}
              testID="enroll-student-search"
            />
            {studentResults.length > 0 ? (
              <View style={s.dropdown}>
                {studentResults.map((r) => (
                  <Pressable key={r.user_id} onPress={() => { setSelectedStudent(r); setStudentQ(''); setStudentResults([]); }} style={s.dropdownItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '900', fontSize: 12.5, color: theme.colors.onSurface }}>{r.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 }}>{r.avision_id || '—'} • {r.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </AdminCard>

      {/* PRODUCT */}
      <AdminCard style={{ padding: 20 }}>
        <Text style={s.step}>STEP 2 — Choose product</Text>
        {selectedProduct ? (
          <View style={s.selected}>
            <View style={[s.selAvatar, { backgroundColor: theme.colors.brandTertiary }]}>
              <Ionicons name="cube" size={20} color={theme.colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.selName}>{selectedProduct.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Chip label={selectedProduct.type} tone="primary" />
                <Text style={s.selMeta}>₹{Number(selectedProduct.offer_price || selectedProduct.price || 0).toLocaleString('en-IN')} • {selectedProduct.validity_days || 0}d</Text>
              </View>
            </View>
            <Btn small variant="ghost" label="Change" onPress={() => setSelectedProduct(null)} />
          </View>
        ) : (
          <>
            <TextInput
              style={s.input}
              placeholder="Search products by name…"
              placeholderTextColor={theme.colors.mutedLight}
              value={productQ}
              onChangeText={setProductQ}
              testID="enroll-product-search"
            />
            {productResults.length > 0 ? (
              <View style={s.dropdown}>
                {productResults.map((r) => (
                  <Pressable key={r.id} onPress={() => { setSelectedProduct(r); setProductQ(''); setProductResults([]); }} style={s.dropdownItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '900', fontSize: 12.5, color: theme.colors.onSurface }}>{r.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 }}>{r.id} • {r.type} • ₹{Number(r.offer_price || r.price || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </AdminCard>

      {/* PAYMENT */}
      <AdminCard style={{ padding: 20 }}>
        <Text style={s.step}>STEP 3 — Payment</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Amount (₹)</Text>
            <TextInput style={s.input} placeholder="1499" keyboardType="numeric" value={amount} onChangeText={setAmount} testID="enroll-amount" />
            <Text style={{ fontSize: 10.5, color: theme.colors.muted, marginTop: 4, fontWeight: '700' }}>Enter 0 for a free grant</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={s.lbl}>Method</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {METHODS.map((m) => (
                <Pressable key={m} onPress={() => setMethod(m)} style={[s.methodChip, method === m && s.methodChipActive]}>
                  <Text style={[s.methodTxt, method === m && { color: '#FFF' }]}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <Text style={s.lbl}>Note (optional)</Text>
        <TextInput style={[s.input, { height: 60 }]} placeholder="Walk-in enrollment at Kolkata Main…" value={note} onChangeText={setNote} multiline />
      </AdminCard>

      <View style={{ paddingHorizontal: 32, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
        <Btn label="Cancel" variant="ghost" onPress={() => router.replace('/admin')} />
        <Btn label="Create enrollment" icon="checkmark-circle" busy={busy} disabled={!selectedStudent || !selectedProduct} onPress={submit} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  step: { fontSize: 11, color: theme.colors.brand, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, backgroundColor: theme.colors.brandTertiary, borderRadius: 10 },
  selAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  selAvatarTxt: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  selName: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface },
  selMeta: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '700' },
  input: { height: 40, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary, outlineStyle: 'none' as any },
  lbl: { fontSize: 11, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  dropdown: { marginTop: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, maxHeight: 260 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  methodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  methodChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  methodTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurfaceTertiary },
  okBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  okSub: { fontSize: 12, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
});
